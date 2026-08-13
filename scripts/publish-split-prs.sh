#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

ensure_pr() {
  local head="$1"
  local title="$2"
  local body="$3"

  if gh pr view --head "$head" --json url --jq .url >/dev/null 2>&1; then
    echo "PR already exists for $head: $(gh pr view --head "$head" --json url --jq .url)"
    return
  fi

  gh pr create --base master --head "$head" --title "$title" --body "$body"
}

git push -u origin fix/crypto-decrypt-heal
git push -u origin feat/ui-css-restyle
git push origin cursor/safari-dev-refresh-cookie-fb6b

ensure_pr "cursor/safari-dev-refresh-cookie-fb6b" \
  "fix(dev): Safari-compatible refresh cookie on localhost HTTP" \
  "$(cat <<'EOF'
## Summary
- Safari rejects `__Host-` + `Secure` cookies on `http://localhost`, so the refresh session died after the 15-minute JWT.
- Dev profile now writes a non-Secure `chaos_refresh` cookie with SameSite=Lax and still keeps the `__Host-` cookie in production.

## Test plan
- [ ] `SPRING_PROFILES_ACTIVE=dev`, open the web client on Safari `http://localhost:5173`
- [ ] Log in, wait for the access JWT to expire, confirm `/api/auth/refresh` succeeds and the user stays in the app
- [ ] Confirm production profile still sets `__Host-chaos_refresh` with Secure + Strict
EOF
)"

ensure_pr "fix/crypto-decrypt-heal" \
  "fix(crypto): restore decrypt, heal sessions, stop refresh burn on device 401" \
  "$(cat <<'EOF'
## Summary
- Incoming WHISPER failed AES-GCM because AAD used `chatId` at encrypt time and the server strips client-only `_chatId`. Decrypt now rebinds chat context and compares ratchet public keys by bytes, not padded strings.
- A local device bundle no longer skips enrollment when the server does not know the device. Authentic PREKEY from a reset peer replaces the stale session instead of dying as replay.
- HTTP 401 `Current device is not registered or inactive` no longer rotates the refresh-cookie family. That false refresh was logging people out and leaving the next login unable to decrypt.

## Test plan
- [ ] Login after profile setup with an existing local device id and no matching row on the server — device registers, user is not kicked
- [ ] Send/receive after a peer reset: PREKEY is accepted and two-way decrypt works
- [ ] Timeline messages whose envelopes lost `_chatId` decrypt when opened in a chat
- [ ] A device-missing 401 on `/messages/...` does **not** call `/auth/refresh`
- [ ] `cd frontend && npm test -- src/test/crypto-engine.test.js src/test/api.test.js src/test/deviceId.test.js src/test/useMessages.critical.test.jsx`
EOF
)"

ensure_pr "feat/ui-css-restyle" \
  "feat(ui): replace styles.js with token CSS and restyle the client" \
  "$(cat <<'EOF'
## Summary
- Delete the 5k-line `styles.js` runtime stylesheet.
- Ship tokens, primitives and screen CSS plus shared UI primitives (`Button`, `Modal`, `Sheet`, `TextField`).
- Restyle chat, profile, settings and group admin around `ChatView` without changing the crypto protocol.

## Test plan
- [ ] Auth, setup profile, chat list, conversation, group admin, settings, contact profile
- [ ] Dark/light theme and ru/en
- [ ] `cd frontend && npm test && npm run build`
- [ ] Confirm `styles.js` is gone and `frontend/src/styles/tokens.css` loads
EOF
)"

echo "Done. Merge order: Safari cookie -> crypto/session -> UI. Tag v0.4.0 only after those land on master."
