# Security Model

## E2EE Guarantees

Chaos Messenger provides end-to-end encryption using the Double Ratchet protocol (Signal Protocol):

- **Server never has access to message plaintext**. Messages are encrypted per-participant-device before leaving the client.
- **Forward secrecy**: Compromise of current keys does not expose past messages.
- **Future secrecy (post-compromise security)**: Compromise of current keys can be healed after a few messages via DH ratchet steps.

## Key Hierarchy

```
Identity Key Pair (long-term, per device)
  └── Signed Pre-Key (medium-term, rotated periodically)
        └── One-Time Pre-Keys (ephemeral, consumed on first session)
              └── Ephemeral Keys (per-message)

Session state (per participant pair, per device):
  └── Root Key → Chain Keys → Message Keys
```

- **Identity keys** are generated on device registration and NEVER leave the device.
- **Signed pre-key, one-time pre-keys, and ephemeral keys** are uploaded to server as opaque bundles.
- **Session state**: Root key and chain keys are computed locally via X3DH + Double Ratchet; server stores only ciphertext envelopes.

## Authentication

- **JWT-based**: Phone verification → short-lived JWT access token
- **Device binding**: Each session is bound to a specific `X-Device-Id` header
- **WebSocket auth**: JWT + device ID validated on CONNECT; SUBSCRIBE authorization per topic pattern

## Attack Surface

| Attack Vector | Mitigation |
|---|---|
| Server data breach | Server stores only encrypted envelopes: no plaintext messages, no private keys, no session state |
| Compromised JWT | Short expiration (24h); device binding; refresh rotation |
| Man-in-the-middle on first use | TOFU (Trust On First Use) identity key verification out of scope; planned fingerprint verification |
| Attachment leak | Server stores encrypted blobs; download requires `Authentication` + `AttachmentAccessService.canDownload()` (uploader or share chat participant) |
| Call signaling abuse | `CallAuthorizationService.isCallAllowed()` checks caller + target share a chat |
| Replay attacks | Message envelopes have clientMessageId + server-side dedup; X3DH prevents replay of pre-key bundles |
| N+1 information leak | Participant checks in every query; deleted chats are inaccessible |
| Push notification metadata | Push payload contains only chat ID (no message content); E2EE prevents server-side plaintext |


## Security Fixes Applied (Phase 1, 2)

1. **Attachment download**: Added `Authentication` parameter + `AttachmentAccessService.canDownload()` check
2. **Call signaling**: Added `CallAuthorizationService.isCallAllowed()` — caller and target must share a chat
3. **JWT exception handling**: Replaced silent `catch (Exception ignored)` with `log.warn`
4. **Global exception logging**: All exception handlers now log via `GlobalExceptionHandler`
5. **String.valueOf(null)**: Replaced with direct String access (produces "null" string which would bypass certain checks)
6. **Service decomposition**: Eliminated god classes that mixed business logic with data access, reducing the blast radius of any single vulnerability

## Data Classification

| Data | Where stored | Server access |
|---|---|---|
| Message payload (ciphertext) | PostgreSQL (message_envelopes.ciphertext) | Encrypted only |
| Message metadata (timestamps, status) | PostgreSQL (messages table) | Yes (requires auth + participation) |
| Chat membership | PostgreSQL (chat_participants) | Yes (requires auth + participation) |
| Device keys (bundles) | PostgreSQL (device_bundles, signed_pre_keys, one_time_pre_keys) | Public key material only |
| Push subscription keys | PostgreSQL (push_subscriptions) | Yes (push service only) |
| Attachments (encrypted) | Filesystem | Encrypted only |
| Backups (encrypted) | PostgreSQL | Encrypted only |
| Online status | Redis | Yes |
| Unread counters | Redis | Yes (per user) |
