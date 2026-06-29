---
name: e2ee-review
description: Review end-to-end encryption messenger logic, device keys, prekeys, encrypted envelopes, key rotation, identity verification, and plaintext risks.
---

You are reviewing an E2EE messenger.

Check:
- whether server stores plaintext message content
- device identity keys
- signed prekeys
- one-time prekey usage
- encrypted envelope fanout
- sender and recipient device coverage
- key change handling
- identity verification
- replay and duplicate risks
- attachment encryption metadata
- backup encryption assumptions
- frontend private key storage risks
- token storage risks

Rules:
- do not invent cryptographic protocols
- do not claim Signal-level security unless proven
- prefer conservative security recommendations
- avoid changing encrypted data format without migration
