# Chaos protocol notes

This is the contract the tests already enforce. It is not a Signal Protocol
specification and has not been independently audited.

The crypto engine is a module: `frontend/src/crypto-engine.ts` exports `e2ee`.
`window.e2ee` is only a compatibility adapter. Callers use `getE2ee()`.
HTTP from the engine goes through `createCryptoApi()`; a 401/404 must keep
`error.status` so a missing server device can re-register.

## What the server may see

Public device identifiers, public identity / pre-key material, chat membership,
ciphertext, ciphertext size, and delivery timing. It must not receive plaintext,
private identity keys, ratchet message keys, or a backup passphrase.

## Envelope types

| `messageType` | When |
|---|---|
| `PREKEY_WHISPER` | First message to a device, after reserving a pre-key |
| `WHISPER` | Later messages on an existing Double Ratchet session |
| `SELF_WHISPER` | Fan-out to the sender's own device |

AAD version `0x02` binds ciphertext to protocol type, 64-bit chat id, message
index, previous chain length, and ratchet public key. Change any of those
fields — AES-GCM must fail. Tampering must not consume a one-time pre-key or
create a session.

Layout is a 22-byte buffer (18 used + 4 trailing zeros). If a ratchet public
key is present, the encoder appends `uint32` BE length plus Latin-1 key bytes.
Type codes: `PREKEY_WHISPER` = 1, `WHISPER` = 2, `SELF_WHISPER` = 3, unknown = 0.

Pinned hex vectors (`frontend/src/test/envelopeAad.test.js`):

| Context | Hex |
|---|---|
| WHISPER, chat 100, idx 0, pcl 0 | `02020000000000000064000000000000000000000000` |
| PREKEY_WHISPER, chat 1, idx 7, pcl 3 | `02010000000000000001000000070000000300000000` |
| SELF_WHISPER, missing chat | `02030000000000000000000000000000000000000000` |
| WHISPER, chat 100, idx 2, pcl 1, rpk `AB` | `02020000000000000064000000020000000100000000000000024142` |
| unknown type, chat 0 | `02000000000000000000000000000000000000000000` |

## Device trust

A new remote identity starts `UNVERIFIED`. Safety Number / QR moves it to
`VERIFIED`. If that identity key later changes, send and decrypt raise
`IDENTITY_KEY_CHANGED` until the user re-verifies or blocks.

## Delivery

Send is one database transaction plus an outbox row. Kafka is the only notify
path. After reconnect the client asks `GET /realtime/sync?after={cursor}` and
drops duplicate `eventId`s. Typing and presence are ephemeral and skip the
outbox.

## Backup

A passphrase-derived AES-GCM key stays on the device. Restore returns identity
material. It does not promise local history, spent one-time pre-keys, or old
ratchet sessions.

## Tests that pin this

- `frontend/src/test/envelopeAad.test.js` — AAD v2 hex vectors
- `frontend/src/test/cryptoApi.test.js` — HTTP adapter keeps `status` / `code`
- `frontend/src/test/crypto-engine.test.js` — handshake, ratchet, skip, tamper, heal, self-whisper, `KEY_CHANGED`
- `frontend/src/test/messageModel.test.js` — payload / merge / placeholder rules
- `frontend/src/test/messageCrypto.test.js` — decrypt keeps `replyTo`
- `frontend/src/test/messageTimeline.test.js` — merge / optimistic / hidden rows
- `frontend/src/test/messageSend.test.js` — TTL, reply wrapper, payload size
- `backend/.../DurableRealtimeDeliveryTest` — persist before STOMP
- `frontend/e2e/send-reconnect.e2e.spec.js` — send, reload, decrypt from timeline
