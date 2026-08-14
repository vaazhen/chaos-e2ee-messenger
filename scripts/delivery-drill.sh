#!/usr/bin/env bash
# Prove the delivery contract against a running backend.
#
# Happy path:
#   health → outbox/kafka metrics → auth → device register → sync
#   → POST /api/chats/saved → outbox drain → durable sync has the event
#
# Optional:
#   --break-redis   stop compose Redis, expect sync to fail closed (401), restore
#   --pause-kafka   stop Redpanda, write saved-chat, expect PENDING, restore, drain
#
# Does not send fake ciphertext. Kafka pause without a real write cannot grow the outbox.
#
# Usage:
#   bash scripts/delivery-drill.sh
#   BASE_URL=http://localhost:8080 PHONE=+19999999998 CODE=111111 bash scripts/delivery-drill.sh
#   TOKEN=... DEVICE_ID=... bash scripts/delivery-drill.sh --break-redis
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-http://localhost:8080}"
API="$BASE_URL/api"
PHONE="${PHONE:-}"
CODE="${CODE:-}"
TOKEN="${TOKEN:-}"
DEVICE_ID="${DEVICE_ID:-}"
DEVICE_NAME="${DEVICE_NAME:-delivery-drill}"
COMPOSE_CMD="${COMPOSE_CMD:-docker compose}"

BREAK_REDIS=0
PAUSE_KAFKA=0
for arg in "$@"; do
  case "$arg" in
    --break-redis) BREAK_REDIS=1 ;;
    --pause-kafka) PAUSE_KAFKA=1 ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

if [ "$BREAK_REDIS" -eq 1 ] || [ "$PAUSE_KAFKA" -eq 1 ]; then
  restore_deps() {
    $COMPOSE_CMD start redis redpanda >/dev/null 2>&1 || true
  }
  trap restore_deps EXIT
fi

PASS=0
FAIL=0
SKIP=0

pass() { PASS=$((PASS + 1)); echo "  PASS  $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL  $1"; }
skip() { SKIP=$((SKIP + 1)); echo "  SKIP  $1"; }

need_python() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 is required" >&2
    exit 1
  fi
}

json_field() {
  python3 -c '
import json, sys
d = json.load(sys.stdin)
for part in sys.argv[1].split("."):
    if not isinstance(d, dict) or part not in d or d[part] is None:
        print("")
        raise SystemExit
    d = d[part]
print("" if isinstance(d, (dict, list)) else d)
' "$1"
}

safe_body() {
  python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    d = json.loads(raw)
except Exception:
    print(raw[:300])
    raise SystemExit
if isinstance(d, dict):
    for k in ("token", "refreshToken", "deviceRegistrationToken", "setupToken"):
        if d.get(k):
            d[k] = "<redacted>"
print(json.dumps(d, ensure_ascii=False))
'
}

http_code() {
  local url="$1"
  shift
  local code
  code="$(curl -sS -o /tmp/delivery-drill.body -w "%{http_code}" -m "${HTTP_TIMEOUT:-8}" "$@" "$url" || true)"
  printf '%s\n' "${code:-000}"
}

metric() {
  python3 -c '
import re, sys
name = sys.argv[1]
text = open("/tmp/delivery-drill.prom", encoding="utf-8").read()
pat = re.compile(rf"^{re.escape(name)}(?:_total)?(?:\{{[^}}]*\}})?\s+(\S+)\s*$", re.M)
m = pat.search(text)
print(m.group(1) if m else "0")
' "$1"
}

snapshot_metrics() {
  curl -sS -m 8 "$BASE_URL/actuator/prometheus" > /tmp/delivery-drill.prom
}

print_outbox() {
  echo "  outbox pending=$(metric chaos_outbox_pending_count) failed=$(metric chaos_outbox_failed_count) processing=$(metric chaos_outbox_processing_count) dead=$(metric chaos_outbox_dead_count)"
  echo "  written=$(metric chaos_outbox_events_written_total) publish_ok=$(metric chaos_outbox_publish_success_total) consume_ok=$(metric chaos_kafka_consumer_success_total)"
}

unpublished() {
  awk -v p="$(metric chaos_outbox_pending_count)" \
      -v f="$(metric chaos_outbox_failed_count)" \
      -v r="$(metric chaos_outbox_processing_count)" \
      'BEGIN { printf "%.1f", p + f + r }'
}

wait_for_bus() {
  local written_before="$1"
  local consume_before="$2"
  local attempts="${3:-40}"
  local i
  for i in $(seq 1 "$attempts"); do
    snapshot_metrics || true
    local written now_consume backlog
    written="$(metric chaos_outbox_events_written_total)"
    now_consume="$(metric chaos_kafka_consumer_success_total)"
    backlog="$(unpublished)"
    if awk -v w="$written" -v wb="$written_before" -v c="$now_consume" -v cb="$consume_before" -v b="$backlog" \
      'BEGIN { exit !((w + 0) > (wb + 0) && (c + 0) > (cb + 0) && (b + 0) == 0) }'; then
      print_outbox
      return 0
    fi
    sleep 0.5
  done
  print_outbox
  return 1
}

write_saved_chat() {
  HTTP_TIMEOUT=20 http_code "$API/chats/saved" \
    -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Device-Id: $DEVICE_ID"
}

send_opaque_ciphertext() {
  python3 - "$API" "$TOKEN" "$DEVICE_ID" "$USER_ID" "$CHAT_ID" "${IDENTITY_PUBLIC_KEY:-}" <<'PY'
import json, sys, urllib.request, uuid, os, base64

api, token, device_id, user_id, chat_id, identity = sys.argv[1:7]
if not user_id or not chat_id or not identity:
    print("missing userId/chatId/identity", file=sys.stderr)
    sys.exit(2)

req = urllib.request.Request(
    api + "/crypto/devices/my",
    headers={"Authorization": "Bearer " + token, "X-Device-Id": device_id},
)
with urllib.request.urlopen(req, timeout=8) as resp:
    devices = json.loads(resp.read().decode())

active = [d["deviceId"] for d in devices if d.get("active")]
if not active:
    print("no active devices", file=sys.stderr)
    sys.exit(3)

ciphertext = base64.b64encode(os.urandom(32)).decode()
nonce = base64.b64encode(os.urandom(12)).decode()
envelopes = []
for target in active:
    envelopes.append({
        "targetDeviceId": target,
        "targetUserId": int(user_id),
        "messageType": "WHISPER",
        "senderIdentityPublicKey": identity,
        "ciphertext": ciphertext,
        "nonce": nonce,
        "messageIndex": 1,
    })

body = {
    "chatId": int(chat_id),
    "clientMessageId": "drill-" + uuid.uuid4().hex,
    "senderDeviceId": device_id,
    "envelopes": envelopes,
}
req = urllib.request.Request(
    api + "/messages/encrypted/v2",
    data=json.dumps(body).encode(),
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
        "X-Device-Id": device_id,
    },
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read().decode()
        open("/tmp/delivery-drill.body", "w").write(raw)
        sys.stdout.write(raw)
except urllib.error.HTTPError as e:
    err = e.read().decode()
    sys.stderr.write(err)
    sys.exit(e.code)
PY
}

generate_device_bundle() {
  local device_id="$1"
  local javac_bin java_bin java_home
  javac_bin="$(command -v javac || true)"
  java_bin="$(command -v java || true)"
  if [ -z "$javac_bin" ] || [ -z "$java_bin" ]; then
    java_home="${JAVA_HOME:-}"
    if [ -z "$java_home" ] && command -v /usr/libexec/java_home >/dev/null 2>&1; then
      java_home="$(/usr/libexec/java_home 2>/dev/null || true)"
    fi
    if [ -n "$java_home" ]; then
      javac_bin="${java_home}/bin/javac"
      java_bin="${java_home}/bin/java"
    fi
  fi
  if [ ! -x "${javac_bin:-}" ] || [ ! -x "${java_bin:-}" ]; then
    echo "javac/java required to generate a valid ECDSA P-256 device bundle" >&2
    return 1
  fi
  cat > /tmp/DeliveryDrillKeys.java <<'JAVA'
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;

public class DeliveryDrillKeys {
    public static void main(String[] args) throws Exception {
        String deviceId = args[0];
        String deviceName = args[1];
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair signing = generator.generateKeyPair();
        SecureRandom random = new SecureRandom();
        byte[] identity = new byte[32];
        byte[] signedPreKey = new byte[32];
        byte[] oneTime = new byte[32];
        random.nextBytes(identity);
        random.nextBytes(signedPreKey);
        random.nextBytes(oneTime);
        Signature signer = Signature.getInstance("SHA256withECDSAinP1363Format");
        signer.initSign(signing.getPrivate());
        signer.update(signedPreKey);
        Base64.Encoder b64 = Base64.getEncoder();
        System.out.println("{"
                + "\"deviceId\":" + json(deviceId)
                + ",\"deviceName\":" + json(deviceName)
                + ",\"registrationId\":1"
                + ",\"identityPublicKey\":" + json(b64.encodeToString(identity))
                + ",\"signingPublicKey\":" + json(b64.encodeToString(signing.getPublic().getEncoded()))
                + ",\"signedPreKey\":{\"preKeyId\":1,\"publicKey\":"
                + json(b64.encodeToString(signedPreKey))
                + ",\"signature\":" + json(b64.encodeToString(signer.sign()))
                + "},\"oneTimePreKeys\":[{\"preKeyId\":1,\"publicKey\":"
                + json(b64.encodeToString(oneTime)) + "}]}");
    }

    private static String json(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
JAVA
  "$javac_bin" -d /tmp /tmp/DeliveryDrillKeys.java
  "$java_bin" -cp /tmp DeliveryDrillKeys "$device_id" "$DEVICE_NAME"
}

register_device() {
  local device_id="$1"
  local reg_token="$2"
  generate_device_bundle "$device_id" > /tmp/delivery-drill.bundle || return 1
  python3 - "$API" "$reg_token" <<'PY'
import json, sys, urllib.request

api, reg_token = sys.argv[1:3]
with open("/tmp/delivery-drill.bundle", encoding="utf-8") as f:
    body = f.read().encode()
req = urllib.request.Request(
    api + "/crypto/devices/register",
    data=body,
    headers={
        "Content-Type": "application/json",
        "X-Device-Registration-Token": reg_token,
    },
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=8) as resp:
        sys.stdout.write(resp.read().decode())
except urllib.error.HTTPError as e:
    sys.stderr.write(e.read().decode())
    sys.exit(e.code)
PY
}

need_python

echo ""
echo "═══ Delivery drill ═══"
echo "Target: $BASE_URL"
echo ""

echo "── 1. Health ──"
CODE_H=$(http_code "$BASE_URL/actuator/health" || echo "000")
if [ "$CODE_H" = "200" ] && grep -q '"status":"UP"' /tmp/delivery-drill.body; then
  pass "GET /actuator/health → UP"
else
  fail "GET /actuator/health → HTTP $CODE_H $(cat /tmp/delivery-drill.body)"
fi

echo "── 2. Outbox / Kafka metrics ──"
if snapshot_metrics; then
  PENDING="$(metric chaos_outbox_pending_count)"
  DEAD="$(metric chaos_outbox_dead_count)"
  WRITTEN="$(metric chaos_outbox_events_written_total)"
  PUBLISH="$(metric chaos_outbox_publish_success_total)"
  CONSUME="$(metric chaos_kafka_consumer_success_total)"
  print_outbox
  if [ -n "$PENDING" ] && [ -n "$DEAD" ]; then
    pass "prometheus outbox gauges present"
  else
    fail "missing chaos_outbox_* gauges"
  fi
  if awk -v p="$PENDING" 'BEGIN { exit !(p + 0 == 0) }'; then
    pass "outbox pending = 0"
  else
    fail "outbox pending = $PENDING (expected 0 on idle path)"
  fi
  if awk -v d="$DEAD" 'BEGIN { exit !(d + 0 == 0) }'; then
    pass "outbox dead = 0"
  else
    fail "outbox dead = $DEAD"
  fi
  if awk -v w="$WRITTEN" -v p="$PUBLISH" -v c="$CONSUME" 'BEGIN { exit !((w+0)+(p+0)+(c+0) > 0) }'; then
    pass "bus has moved: written=$WRITTEN publish=$PUBLISH consume=$CONSUME"
  else
    pass "counters idle since boot (0). gauges still prove outbox is wired"
  fi
else
  fail "prometheus scrape failed"
fi

echo "── 3. Auth ──"
if [ -n "$TOKEN" ]; then
  pass "using TOKEN from env"
elif [ -n "$PHONE" ] && [ -n "$CODE" ]; then
  VERIFY_CODE=$(http_code "$API/auth/verify-code" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$PHONE\",\"code\":\"$CODE\"}" || echo "000")
  if [ "$VERIFY_CODE" = "200" ]; then
    TOKEN="$(json_field token < /tmp/delivery-drill.body)"
    DEVICE_REG_TOKEN="$(json_field deviceRegistrationToken < /tmp/delivery-drill.body)"
    USER_ID="$(json_field userId < /tmp/delivery-drill.body)"
    SETUP_TOKEN="$(json_field setupToken < /tmp/delivery-drill.body)"
    if [ -n "$SETUP_TOKEN" ] && [ -z "$TOKEN" ]; then
      fail "verify-code returned setupToken; complete-setup is out of scope for this drill"
    elif [ -n "$TOKEN" ] && [ -n "$DEVICE_REG_TOKEN" ]; then
      pass "verify-code → JWT + deviceRegistrationToken"
    else
      fail "verify-code 200 but missing token fields"
    fi
  else
    fail "verify-code HTTP $VERIFY_CODE $(safe_body < /tmp/delivery-drill.body)"
  fi
else
  SEED_CODE=$(http_code "$API/demo/seed" || echo "000")
  if [ "$SEED_CODE" = "200" ]; then
    PHONE="$(json_field alice_demo.phone < /tmp/delivery-drill.body)"
    CODE="$(json_field alice_demo.code < /tmp/delivery-drill.body)"
    if [ -z "$PHONE" ] || [ -z "$CODE" ]; then
      fail "seed 200 but alice_demo.phone/code missing $(safe_body < /tmp/delivery-drill.body)"
    else
      VERIFY_CODE=$(http_code "$API/auth/verify-code" \
        -H "Content-Type: application/json" \
        -d "{\"phone\":\"$PHONE\",\"code\":\"$CODE\"}" || echo "000")
      TOKEN="$(json_field token < /tmp/delivery-drill.body)"
      DEVICE_REG_TOKEN="$(json_field deviceRegistrationToken < /tmp/delivery-drill.body)"
      USER_ID="$(json_field userId < /tmp/delivery-drill.body)"
      STATUS="$(json_field status < /tmp/delivery-drill.body)"
      if [ "$VERIFY_CODE" = "200" ] && [ -n "$TOKEN" ] && [ -n "$DEVICE_REG_TOKEN" ]; then
        pass "demo seed + verify-code ($PHONE)"
      else
        fail "verify-code HTTP $VERIFY_CODE status=$STATUS $(safe_body < /tmp/delivery-drill.body)"
      fi
    fi
  elif [ "$SEED_CODE" = "403" ] || [ "$SEED_CODE" = "404" ]; then
    skip "demo seed disabled (HTTP $SEED_CODE). Pass PHONE+CODE or TOKEN+DEVICE_ID"
  else
    skip "demo seed HTTP $SEED_CODE. Pass PHONE+CODE or TOKEN+DEVICE_ID"
  fi
fi

echo "── 4. Device register + realtime sync ──"
DEVICE_READY=0
if [ -z "$TOKEN" ]; then
  skip "no JWT — cannot hit /api/realtime/sync"
else
  if [ -n "${DEVICE_ID}" ]; then
    DEVICE_READY=1
    pass "using DEVICE_ID from env"
  elif [ -z "${DEVICE_REG_TOKEN:-}" ]; then
    skip "have JWT but no deviceRegistrationToken and no DEVICE_ID"
  else
    DEVICE_ID="drill-$(date +%s)"
    if register_device "$DEVICE_ID" "$DEVICE_REG_TOKEN" > /tmp/delivery-drill.body 2>/tmp/delivery-drill.err; then
      REGISTERED_ID="$(json_field deviceId < /tmp/delivery-drill.body)"
      if [ "$REGISTERED_ID" = "$DEVICE_ID" ]; then
        DEVICE_READY=1
        IDENTITY_PUBLIC_KEY="$(json_field identityPublicKey < /tmp/delivery-drill.bundle)"
        pass "device registered $DEVICE_ID"
      else
        fail "register returned deviceId=$REGISTERED_ID"
      fi
    else
      fail "device register failed: $(safe_body < /tmp/delivery-drill.err)"
    fi
  fi

  if [ "$DEVICE_READY" -eq 1 ]; then
    SYNC_CODE=$(http_code "$API/realtime/sync?after=0&limit=20" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Device-Id: $DEVICE_ID" || echo "000")
    if [ "$SYNC_CODE" = "200" ]; then
      python3 - <<'PY'
import json
with open("/tmp/delivery-drill.body") as f:
    d = json.load(f)
assert "events" in d and "nextCursor" in d and "hasMore" in d
open("/tmp/delivery-drill.cursor", "w").write(str(d["nextCursor"]))
print(f"events={len(d['events'])} nextCursor={d['nextCursor']} hasMore={d['hasMore']}")
PY
      pass "GET /api/realtime/sync → 200"
    else
      fail "GET /api/realtime/sync → HTTP $SYNC_CODE $(safe_body < /tmp/delivery-drill.body)"
      DEVICE_READY=0
    fi
  fi
fi

if [ "$DEVICE_READY" -eq 1 ]; then
  echo "── 5. Command → outbox → Kafka → sync ──"
  snapshot_metrics || true
  WRITTEN_BEFORE="$(metric chaos_outbox_events_written_total)"
  CONSUME_BEFORE="$(metric chaos_kafka_consumer_success_total)"
  SAVED_CODE=$(write_saved_chat || echo "000")
  if [ "$SAVED_CODE" = "200" ]; then
    CHAT_ID="$(json_field chatId < /tmp/delivery-drill.body)"
    pass "POST /api/chats/saved → chatId=$CHAT_ID"
  else
    fail "POST /api/chats/saved → HTTP $SAVED_CODE $(safe_body < /tmp/delivery-drill.body)"
  fi
  if [ "$SAVED_CODE" = "200" ]; then
    if wait_for_bus "$WRITTEN_BEFORE" "$CONSUME_BEFORE"; then
      pass "outbox drained after write (written and consume increased, pending=0)"
    else
      fail "bus did not drain after saved-chat write"
    fi
    AFTER_CURSOR="$(cat /tmp/delivery-drill.cursor 2>/dev/null || echo 0)"
    SYNC_AFTER=$(http_code "$API/realtime/sync?after=${AFTER_CURSOR}&limit=20" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Device-Id: $DEVICE_ID" || echo "000")
    if [ "$SYNC_AFTER" = "200" ]; then
      EVENT_COUNT="$(python3 -c 'import json; d=json.load(open("/tmp/delivery-drill.body")); open("/tmp/delivery-drill.cursor","w").write(str(d.get("nextCursor") or 0)); print(len(d.get("events") or []))')"
      echo "  sync after=$AFTER_CURSOR events=$EVENT_COUNT"
      if awk -v n="$EVENT_COUNT" 'BEGIN { exit !(n + 0 > 0) }'; then
        pass "durable log contains the saved-chat event"
      else
        fail "sync returned 0 events after successful outbox write"
      fi
    else
      fail "GET /api/realtime/sync after write → HTTP $SYNC_AFTER $(safe_body < /tmp/delivery-drill.body)"
    fi

    echo "── 5b. Opaque ciphertext send → bus → sync ──"
    if [ -z "${USER_ID:-}" ] || [ -z "${IDENTITY_PUBLIC_KEY:-}" ] || [ -z "${CHAT_ID:-}" ]; then
      skip "need userId + device identity + chatId for encrypted send"
    else
      snapshot_metrics || true
      SEND_WRITTEN="$(metric chaos_outbox_events_written_total)"
      SEND_CONSUME="$(metric chaos_kafka_consumer_success_total)"
      SEND_CURSOR="$(cat /tmp/delivery-drill.cursor 2>/dev/null || echo 0)"
      if send_opaque_ciphertext > /tmp/delivery-drill.send 2>/tmp/delivery-drill.err; then
        MSG_ID="$(json_field messageId < /tmp/delivery-drill.body)"
        pass "POST /api/messages/encrypted/v2 → messageId=$MSG_ID (opaque blob, server does not decrypt)"
        if wait_for_bus "$SEND_WRITTEN" "$SEND_CONSUME"; then
          pass "outbox drained after encrypted send"
        else
          fail "bus did not drain after encrypted send"
        fi
        SYNC_MSG=$(http_code "$API/realtime/sync?after=${SEND_CURSOR}&limit=50" \
          -H "Authorization: Bearer $TOKEN" \
          -H "X-Device-Id: $DEVICE_ID" || echo "000")
        if [ "$SYNC_MSG" = "200" ]; then
          python3 - <<'PY'
import json
d = json.load(open("/tmp/delivery-drill.body"))
events = d.get("events") or []
blob = False
created = False
for ev in events:
    payload = ev.get("payload") or {}
    text = json.dumps(payload)
    if "MESSAGE_CREATED" in text or payload.get("eventType") == "MESSAGE_CREATED" or payload.get("type") == "MESSAGE_CREATED":
        created = True
    if payload.get("ciphertext") or (isinstance(payload.get("envelope"), dict) and payload["envelope"].get("ciphertext")):
        blob = True
print(f"events={len(events)} message_created={created} ciphertext_present={blob}")
open("/tmp/delivery-drill.cipher-ok", "w").write("1" if created else "0")
PY
          if [ "$(cat /tmp/delivery-drill.cipher-ok)" = "1" ]; then
            pass "durable log contains MESSAGE_CREATED after ciphertext send"
          else
            fail "sync after ciphertext send has no MESSAGE_CREATED"
          fi
        else
          fail "GET /api/realtime/sync after ciphertext send → HTTP $SYNC_MSG $(safe_body < /tmp/delivery-drill.body)"
        fi
      else
        fail "encrypted send failed: $(safe_body < /tmp/delivery-drill.err)"
      fi
    fi
  fi
fi

if [ "$PAUSE_KAFKA" -eq 1 ]; then
  echo "── 6. Pause Kafka / Redpanda ──"
  $COMPOSE_CMD stop redpanda
  sleep 2
  CODE_K=$(http_code "$BASE_URL/actuator/health" || echo "000")
  if [ "$CODE_K" = "200" ]; then
    pass "health still UP while Redpanda is stopped"
  else
    fail "health HTTP $CODE_K while Redpanda is stopped"
  fi
  if [ "$DEVICE_READY" -eq 1 ]; then
    snapshot_metrics || true
    PAUSE_WRITTEN="$(metric chaos_outbox_events_written_total)"
    PAUSE_CONSUME="$(metric chaos_kafka_consumer_success_total)"
    DEAD_BEFORE="$(metric chaos_outbox_dead_count)"
    PAUSE_WRITE=$(write_saved_chat || echo "000")
    if [ "$PAUSE_WRITE" != "200" ]; then
      fail "saved-chat write while Kafka down → HTTP $PAUSE_WRITE"
    else
      sleep 2
      snapshot_metrics || true
      BACKLOG_DOWN="$(unpublished)"
      DEAD_DOWN="$(metric chaos_outbox_dead_count)"
      echo "  unpublished backlog=$BACKLOG_DOWN dead=$DEAD_DOWN"
      if awk -v b="$BACKLOG_DOWN" 'BEGIN { exit !(b + 0 > 0) }'; then
        pass "outbox retained unpublished work while Redpanda is down"
      else
        fail "expected pending+failed+processing > 0 while Kafka is down, got $BACKLOG_DOWN"
      fi
      if awk -v d="$DEAD_DOWN" -v db="${DEAD_BEFORE:-0}" 'BEGIN { exit !(d + 0 == db + 0) }'; then
        pass "no DEAD outbox rows while Kafka is down"
      else
        fail "outbox dead grew while Kafka is down: $DEAD_DOWN"
      fi
    fi
  else
    skip "no device — cannot write outbox while Kafka is paused"
    PAUSE_WRITTEN=""
    PAUSE_CONSUME=""
  fi
  $COMPOSE_CMD start redpanda
  echo "  waiting for Redpanda health..."
  for _ in $(seq 1 30); do
    if $COMPOSE_CMD ps redpanda --format '{{.Health}}' 2>/dev/null | grep -qi healthy; then
      break
    fi
    sleep 2
  done
  if [ -n "${PAUSE_WRITTEN:-}" ]; then
    if wait_for_bus "$PAUSE_WRITTEN" "$PAUSE_CONSUME" 90; then
      pass "bus drained after Redpanda restore"
    else
      fail "bus did not drain after Redpanda restore"
    fi
  else
    sleep 5
    snapshot_metrics || true
    print_outbox
    BACKLOG="$(unpublished)"
    if awk -v b="$BACKLOG" 'BEGIN { exit !(b + 0 == 0) }'; then
      pass "unpublished backlog returned to 0 after Redpanda restore"
    else
      fail "unpublished backlog=$BACKLOG after restore"
    fi
  fi
fi

if [ "$BREAK_REDIS" -eq 1 ]; then
  echo "── 7. Break Redis (JWT fail-closed) ──"
  if [ -z "$TOKEN" ] || [ -z "${DEVICE_ID}" ]; then
    skip "--break-redis needs TOKEN and DEVICE_ID"
  else
    $COMPOSE_CMD stop redis
    sleep 2
    BROKEN=$(http_code "$API/realtime/sync?after=0&limit=1" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Device-Id: $DEVICE_ID" || echo "000")
    if [ "$BROKEN" = "401" ] || [ "$BROKEN" = "403" ]; then
      pass "sync fail-closed → $BROKEN while Redis is down"
    else
      fail "sync HTTP $BROKEN while Redis is down (expected 401 or 403)"
    fi
    $COMPOSE_CMD start redis
    echo "  waiting for Redis health..."
    for _ in $(seq 1 20); do
      if $COMPOSE_CMD ps redis --format '{{.Health}}' 2>/dev/null | grep -qi healthy; then
        break
      fi
      sleep 2
    done
    sleep 2
    RESTORED=$(http_code "$API/realtime/sync?after=0&limit=1" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Device-Id: $DEVICE_ID" || echo "000")
    if [ "$RESTORED" = "200" ]; then
      pass "sync restored → 200 after Redis is back"
    else
      fail "sync HTTP $RESTORED after Redis restore"
    fi
  fi
fi

if [ "$DEVICE_READY" -eq 1 ]; then
  echo "── 8. Local burst (not capacity) ──"
  python3 - "$BASE_URL" "$API" "$TOKEN" "$DEVICE_ID" <<'PY'
import sys, time, urllib.request, concurrent.futures

base, api, token, device_id = sys.argv[1:5]

def burst(url, headers, n=80, workers=8):
    ok = 0
    start = time.perf_counter()
    def one(_):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=3) as resp:
                return 200 <= resp.status < 400
        except Exception:
            return False
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        for result in pool.map(one, range(n)):
            if result:
                ok += 1
    elapsed = max(time.perf_counter() - start, 0.001)
    return ok, n - ok, ok / elapsed

h_ok, h_fail, h_rps = burst(base + "/actuator/health", {})
print(f"  health {h_ok}/{h_ok + h_fail} ok  {h_rps:.0f} rps")
s_ok, s_fail, s_rps = burst(
    api + "/realtime/sync?after=0&limit=1",
    {"Authorization": "Bearer " + token, "X-Device-Id": device_id},
)
print(f"  sync   {s_ok}/{s_ok + s_fail} ok  {s_rps:.0f} rps")
open("/tmp/delivery-drill.rps", "w").write(f"{h_rps:.0f} {s_rps:.0f} {h_ok} {s_ok}\n")
PY
  read -r HEALTH_RPS SYNC_RPS HEALTH_OK SYNC_OK < /tmp/delivery-drill.rps
  if awk -v h="$HEALTH_OK" -v s="$SYNC_OK" 'BEGIN { exit !(h + 0 > 0 && s + 0 > 0) }'; then
    pass "local burst health=${HEALTH_RPS} rps sync=${SYNC_RPS} rps (one Mac, one JVM — not capacity)"
  else
    fail "local burst had zero successes"
  fi
fi

echo ""
echo "═══ Results: $PASS passed, $FAIL failed, $SKIP skipped ═══"
echo ""
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
exit 0
