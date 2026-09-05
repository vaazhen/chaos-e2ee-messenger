# Chaos crypto audit brief

This is a briefing for an external cryptographer. It is **not** an audit
and does not claim the protocol is safe.

## What Chaos is

Own X3DH-inspired handshake + Double Ratchet-style sessions. Not Signal.
Client: `frontend/src/crypto-engine.ts`, AAD: `frontend/src/envelopeAad.ts`.
Contract text: `docs/protocol.md`. Tests pin vectors and a few negative paths.

## Scope an auditor should treat as in

- Envelope AAD v2 binding and all decrypt fallbacks (`chatId: 0`, missing ratchet key).
- OTK reserve-on-server vs consume-on-client (window for exhaustion / reuse).
- PREKEY and WHISPER replay, skipped-key bounds, concurrent send indexes.
- Identity substitution vs Safety Number (TOFU).
- Device revoke: delivery stop vs leftover peer sessions.
- Group fanout (pairwise, no MLS / sender keys). Cap 32 participants.
- Device cap 8; revoke stops API/fanout/WS, does not wipe peer sessions.
- Call media key wrap; fail-closed on callee.
- Web origin: server-delivered JS can steal keys. Electron/signed client is
  the high-assurance distribution path.

## Out of scope unless the sponsor expands it

- Formal proof of FS/PCS.
- Side-channel analysis of WebCrypto in browsers.
- Metadata privacy (membership, timing, size).
- Production TURN / object storage.

## Evidence already in-repo

Pinned AAD hex, PREKEY replay, OTK keep-on-auth-fail, out-of-order skip,
WHISPER replay after success, identity-key change, durable delivery
idempotency (`DurableRealtimeDeliveryTest`).

## What we cannot do in this repository

A model-assisted review is not an independent cryptographic audit. Hire a
reviewer who has shipped or broken messenger ratchets, give them this brief
plus a frozen tag, and publish their findings unedited.
