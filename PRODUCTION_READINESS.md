# Production Readiness

Status date: **2026-07-12**

This file separates controls implemented in the repository from release work that requires a real infrastructure environment or an independent reviewer.

## Current status

| Domain | Repository status | Remaining release gate |
|---|---|---|
| Client E2EE state | Hardened storage and concurrency controls | Independent cryptographic audit |
| Device verification | Per-device Safety Number and `KEY_CHANGED` blocking | Auditable key directory/key transparency for high-assurance use |
| Browser authentication | Memory-only access token and rotating HttpOnly refresh cookie | Abuse testing and external pentest |
| Realtime delivery | Durable per-device cursor recovery and event deduplication | Load, reconnect-storm and broker-failure testing |
| Attachments | Bounded encrypted filesystem/PVC adapter | S3-compatible storage, quotas and lifecycle controls |
| Electron | Sandboxed renderer and restricted IPC | Signed/notarised installers and desktop pentest |
| Stateful services | Local Compose and Kubernetes application manifests | Managed/operator-backed HA PostgreSQL, Redis and Kafka |
| CI/CD | Build, test and security workflow definitions | Protected release environment and real deployment credentials |
| Observability | Metrics/logging stack configuration | SLOs, alert ownership and incident exercises |
| Validation | Frontend and configuration checks passed | Backend Maven/integration/E2E/load testing in connected CI |

## Implemented controls

### Cryptography and client storage

- Private identity, pre-key, ratchet and trust state moved out of `localStorage`.
- AES-GCM encrypted IndexedDB records with a non-extractable WebCrypto wrapping key.
- Concurrent ratchet mutation locking.
- One-time pre-key consumption only after authenticated bootstrap.
- Replayed pre-key bootstrap messages are rejected.
- Automatic one-time pre-key pool replenishment.
- Skipped-message-key support for out-of-order delivery.
- Per-device Safety Number verification.
- Persistent `KEY_CHANGED` state and encrypted-operation blocking.
- Encrypted password-protected backup and restore.

### Authentication and sessions

- Short-lived access JWT with issuer, audience, `jti`, token type and session ID.
- Access token stored only in process memory.
- Host-only `Secure`, `HttpOnly`, `SameSite=Strict` refresh cookie.
- Refresh token digest storage, rotation, token families and reuse detection.
- Credential throttling and bounded inputs.
- Latest-issued-code-only OTP verification.
- Strict phone/OTP validation and hashed phone identifiers in rate-limit keys/logs.
- Fail-fast credentialed CORS and WebSocket origin allowlists.

### Delivery

- Transactional outbox for Kafka-enabled deployments.
- Event IDs propagated to realtime payloads.
- Durable per-device realtime event store with monotonic sequence numbers.
- Authenticated `/api/realtime/sync` catch-up endpoint.
- Client cursor persistence, reconnect recovery, buffering and ordered replay.
- Client deduplication for at-least-once delivery.
- Kafka configuration fails at startup when Kafka is enabled without broker addresses.

### Attachments

- UUID validation and canonical path containment.
- Configurable maximum encrypted payload size.
- Temporary writes and atomic finalisation where supported.
- Cleanup after transaction rollback.
- Chat membership checks for upload/download.
- `no-store` and `nosniff` download headers.

### Web, Electron and deployment

- CSP and security headers at the web edge.
- Electron sandbox, context isolation and disabled Node integration.
- Trusted-sender IPC validation and bounded file IPC.
- HTTPS-only external links and blocked arbitrary navigation/webviews.
- Fail-closed Electron endpoint validation for HTTPS/WSS.
- Relative Electron asset paths for packaged `file://` pages.
- Separate management port and hidden Actuator/docs routes.
- Non-root/read-only/seccomp/drop-capabilities Kubernetes baseline.
- HPA, PodDisruptionBudget and topology spreading.
- Dependency review, CodeQL, image scanning and SBOM workflow definitions.

## Release blockers outside this packaging run

### Independent review

Before high-risk use, obtain:

- cryptographic protocol review;
- web/API/WebSocket authorisation pentest;
- Electron IPC and update-channel review;
- dependency and release supply-chain review.

### Object storage

The current attachment adapter uses local/PVC storage. A horizontally scaled production environment should add:

- S3-compatible object storage;
- presigned upload/download;
- ciphertext checksum verification;
- user/chat quotas and bandwidth controls;
- multipart upload;
- orphan cleanup and deletion reconciliation;
- lifecycle retention and audit metrics.

### Stateful infrastructure

Use managed services or production operators with:

- multi-zone deployment;
- TLS and encryption at rest;
- automatic backups and point-in-time recovery;
- tested restore procedures and measured RPO/RTO;
- Kafka replication/min-ISR and dead-letter operations;
- Redis persistence/HA appropriate for session revocation.

### Operations

Define and test:

- API, message persistence, authentication and realtime SLOs;
- alert rules and on-call ownership;
- signing-key rotation and emergency revocation;
- migration rollback/recovery;
- incident response and user notification procedures;
- privacy, retention and abuse-handling policies.

### Release validation

Run in a connected CI/staging environment:

```bash
cd backend && ./mvnw verify
cd frontend && npm ci && npm run lint && npm test && npm run test:coverage && npm run build
```

Also run:

- PostgreSQL/Redis/Kafka integration tests;
- browser E2E against a real backend;
- Docker image and full Compose startup;
- Kubernetes smoke tests;
- load, soak, reconnect-storm and broker-restart scenarios;
- signed Electron installer tests on supported operating systems.

A release should be approved from recorded evidence, not from a generic “production-ready” label.
