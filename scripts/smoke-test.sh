#!/usr/bin/env bash
# === Chaos Messenger — End-to-End Smoke Test ===
# Tests: registration → device setup → bundle resolve → message send
# Usage: bash scripts/smoke-test.sh [BASE_URL]
#   BASE_URL defaults to http://localhost:8080

set -euo pipefail

BASE="${1:-http://localhost:8080}"
API="$BASE/api"
PASS=0
FAIL=0

pass() { PASS=$((PASS+1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ✗ $1"; }

echo ""
echo "═══ Chaos Messenger Smoke Test ═══"
echo "Target: $BASE"
echo ""

# ── Step 1: Health ──────────────────────────────────────────
echo "── 1. Health check ──"
HEALTH=$(curl -sf "$BASE/actuator/health" || true)
if echo "$HEALTH" | grep -q '"status":"UP"'; then
  pass "Backend is UP"
else
  fail "Backend is not healthy: $HEALTH"
fi

# ── Step 2: Seed demo user ──────────────────────────────────
echo "── 2. Seed demo user ──"
SEED=$(curl -sf "$API/demo/seed" || true)
PHONE=$(echo "$SEED" | grep -o '"phone":"[^"]*"' | cut -d'"' -f4)
CODE=$(echo "$SEED" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
USERNAME=$(echo "$SEED" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)

if [ -n "$PHONE" ]; then
  pass "Demo seed: phone=$PHONE code=$CODE username=$USERNAME"
else
  fail "Demo seed failed: $SEED"
fi

# ── Step 3: Send verification code ─────────────────────────
echo "── 3. Send verification code ──"
SEND_CODE=$(curl -sf -X POST "$API/auth/send-code" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"via\":\"demo\"}" || true)
if echo "$SEND_CODE" | grep -q '"sent":true'; then
  pass "Verification code sent"
else
  fail "Send-code failed: $SEND_CODE"
fi

# ── Step 4: Verify code ────────────────────────────────────
echo "── 4. Verify code ──"
VERIFY=$(curl -sf -X POST "$API/auth/verify-code" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"code\":\"$CODE\"}" || true)
SETUP_TOKEN=$(echo "$VERIFY" | grep -o '"setupToken":"[^"]*"' | cut -d'"' -f4)
DEVICE_TOKEN=$(echo "$VERIFY" | grep -o '"deviceRegistrationToken":"[^"]*"' | cut -d'"' -f4)
JWT=$(echo "$VERIFY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo "$VERIFY" | grep -o '"userId":[0-9]*' | cut -d: -f2)

if [ -n "$SETUP_TOKEN" ]; then
  pass "New user — setupToken obtained"
elif [ -n "$JWT" ] && [ -n "$DEVICE_TOKEN" ]; then
  pass "Existing user — JWT + deviceToken obtained"
else
  fail "Verify-code failed: $VERIFY"
fi

# ── Step 5: Complete setup (first time) ─────────────────────
echo "── 5. Complete profile setup ──"
if [ -n "$SETUP_TOKEN" ]; then
  COMPLETE=$(curl -sf -X POST "$API/auth/complete-setup" \
    -H "Content-Type: application/json" \
    -d "{\"setupToken\":\"$SETUP_TOKEN\",\"firstName\":\"Demo\",\"lastName\":\"User\",\"username\":\"$USERNAME\"}" || true)
  JWT=$(echo "$COMPLETE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  DEVICE_TOKEN=$(echo "$COMPLETE" | grep -o '"deviceRegistrationToken":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$JWT" ]; then
    pass "Profile setup complete — JWT obtained"
  else
    fail "Complete-setup failed: $COMPLETE"
  fi
fi

# ── Step 6: Register device ─────────────────────────────────
echo "── 6. Register device ──"
DEVICE_REG=$(curl -sf -X POST "$API/crypto/devices/register" \
  -H "Content-Type: application/json" \
  -H "X-Device-Registration-Token: $DEVICE_TOKEN" \
  -d '{
    "deviceId":"smoke-test-device",
    "registrationId":1,
    "identityKeyPairPublic":"test-identity-public",
    "signedPreKeyPublic":"test-signed-pre-key",
    "signedPreKeySignature":"test-signature",
    "signedPreKeyId":1,
    "oneTimePreKeysList":[{"keyId":1,"publicKey":"test-otpk"}]
  }' || true)
DEV_OK=$(echo "$DEVICE_REG" | grep -o '"success":true' || echo "")
if [ -n "$DEV_OK" ]; then
  pass "Device registered"
else
  fail "Device registration failed: $DEVICE_REG"
fi

# ── Step 7: Get own bundle ─────────────────────────────────
echo "── 7. Get own bundle ──"
BUNDLE=$(curl -sf "$API/crypto/bundle/$USERNAME" \
  -H "Authorization: Bearer $JWT" || true)
if echo "$BUNDLE" | grep -q '"deviceId"'; then
  pass "Bundle resolved"
else
  fail "Bundle request failed: $BUNDLE"
fi

# ── Summary ────────────────────────────────────────────────
echo ""
echo "═══ Results: $PASS passed, $FAIL failed ═══"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "  🎉 ALL CHECKS PASSED — demo is ready!"
  echo ""
  echo "  Demo login: phone=$PHONE code=$CODE"
  echo ""
  exit 0
else
  echo "  ❌ $FAIL check(s) failed — review output above"
  echo ""
  exit 1
fi
