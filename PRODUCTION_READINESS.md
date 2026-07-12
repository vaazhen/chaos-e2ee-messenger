# Production Readiness

Status date: **2026-07-12**

This document separates controls implemented in the repository from external work that must be completed before a high-risk public launch. “Implemented” means present in source and covered by the validation described in `VALIDATION_REPORT.md`; it does not mean independently audited.

## Readiness summary

| Domain | Current status | Launch requirement |
|---|---|---|
| Client E2EE state | Hardened | Independent cryptographic audit |
| Identity verification | Implemented per device | Key transparency / auditable directory |
| Browser auth storage | Hardened | Pentest and session abuse testing |
| Electron sandbox/IPC | Hardened baseline | Code signing, notarisation and desktop pentest |
| Message delivery | At-least-once with event IDs | Reconnect/missed-event recovery under load |
| Backend auth | Short JWT + rotating refresh family | Production Redis HA and operational revocation tests |
| Attachments | Bounded local/PVC implementation | S3-compatible object storage and quotas |
| PostgreSQL/Redis/Kafka | Demo/dev manifests supplied | Managed or operator-backed HA services |
| Kubernetes workload security | Hardened stateless base | Cluster policy, NetworkPolicy and secret manager |
| CI/CD | Security gates defined | Protected environments and organisation-specific credentials |
| Observability | Metrics/logging stack supplied | SLOs, alerts, on-call and incident runbooks |
| Validation | Frontend and static validation passed | Backend Maven, E2E and load suites in connected CI |

## Implemented controls

### Client and cryptography

- Private E2EE records migrated out of `localStorage`.
- AES-GCM encrypted IndexedDB records with a non-extractable WebCrypto wrapping key.
- Ratchet state serialisation across concurrent operations/tabs.
- Full X3DH/Double Ratchet cycle tests, skipped-key tests and concurrent-send tests.
- Per-device Safety Number verification.
- `KEY_CHANGED` persistence and encrypted-operation blocking.
- Memory-only access JWT.
- Legacy browser token cleanup.
- Encrypted password-protected backup/restore with increased PBKDF2 work factor.

### Authentication

- 15-minute default access JWT with issuer, audience, `jti`, token type and session ID.
- Host-only `Secure`, `HttpOnly`, `SameSite=Strict` refresh cookie.
- Refresh token stored as SHA-256 digest in Redis.
- Refresh token family, rotation, consumed-token reuse detection and family revocation.
- Credential rate limiting and bounded password inputs.
- Latest-issued-code-only OTP verification, strict OTP/phone format validation and hashed phone identifiers in logs/rate-limit keys.
- Fail-fast credentialed CORS/WebSocket origin allowlists.
- No-store response headers on authentication responses.

### Delivery and storage

- Transactional outbox for Kafka-enabled deployments.
- Event IDs propagated to realtime payloads.
- Deduplication only after successful backend fanout, allowing Kafka retry after failure.
- Client-side WebSocket event deduplication.
- Attachment ID validation, path normalisation, size bounds, temporary writes, atomic move and rollback cleanup.

### Edge, Electron and infrastructure

- Browser and Electron CSP/security headers.
- Electron renderer sandbox, context isolation, disabled Node integration, trusted-sender IPC checks and HTTPS-only external links.
- Nginx auth/API rate limits, connection limits, upload size limits and hidden management/docs paths.
- Actuator management port separated from the public application port.
- Kubernetes non-root/read-only/seccomp/drop-capabilities baseline.
- HPA, PodDisruptionBudget and topology spreading.
- No real Kubernetes secrets committed.
- CI dependency review, CodeQL, coverage/build gates, image scan, SBOM/provenance and rollout failure enforcement.

## Required launch blockers

### 1. Independent security review

A qualified external reviewer must examine:

- protocol construction and X3DH/Double Ratchet interoperability assumptions;
- pre-key reservation, replay, identity replacement and multi-device edge cases;
- browser/Electron key lifecycle and backup recovery;
- XSS, CSRF, CORS, WebSocket authentication and IPC boundaries;
- backend authorisation for every chat/device/message operation.

Release gate: all critical/high findings fixed and re-tested.

### 2. Key transparency

Safety Numbers detect a changed key only after a user has verified and persisted trust. A malicious or compromised directory server can still present different first-seen keys to different clients.

Release gate for high-assurance use: append-only auditable key directory, consistency proofs/gossip, or an equivalent independently verifiable mechanism.

### 3. Endpoint compromise and supply chain

Encrypted IndexedDB does not protect secrets from JavaScript already executing in the trusted origin. Required controls include:

- strict CSP without unnecessary inline allowances;
- dependency pinning and recurring SCA;
- reproducible/signed builds;
- protected release branches and environments;
- Electron code signing/notarisation and signed auto-updates;
- incident response for a compromised web distribution origin.

### 4. Production attachment service

The supplied filesystem/PVC adapter is suitable for local evaluation and bounded single-environment use, not final horizontally scaled production.

Release gate:

- S3-compatible object storage;
- presigned upload/download flow;
- ciphertext digest validation;
- user/chat quotas and bandwidth limits;
- multipart upload, orphan cleanup and lifecycle retention;
- deletion reconciliation and storage audit metrics.

### 5. Stateful infrastructure

Use managed services or production operators for PostgreSQL, Redis and Kafka/Redpanda.

Release gate:

- multi-AZ/zone placement;
- encryption in transit and at rest;
- automated backups and point-in-time recovery;
- quarterly restore drill with measured RPO/RTO;
- Kafka replication/min-ISR and dead-letter operations;
- Redis persistence/HA appropriate to session revocation requirements.

### 6. Realtime recovery and scale

Realtime transport is at least once. The current event-ID dedup cache is process-local and bounded.

Release gate:

- durable or protocol-level missed-event recovery after disconnect;
- monotonic cursor/sequence and REST catch-up path;
- duplicate, reordered and delayed event tests;
- gateway/broker restart tests;
- target concurrent-connection, fanout and reconnect-storm benchmarks;
- decision on sharded realtime gateways before broadcast cost becomes material.

### 7. Operational security

Release gate:

- Vault/KMS/External Secrets integration;
- signing-key rotation and emergency revocation procedure;
- database migration rollback/recovery plan;
- SLOs for API, message persistence, realtime delivery and authentication;
- alerts, dashboards, on-call ownership and incident runbooks;
- privacy policy, retention rules, abuse controls and legal review for target markets.

## Suggested deployment evolution

Phase 1: hardened modular monolith with managed stateful services.

Phase 2: separate deployments from the same build for API, realtime and worker responsibilities.

Phase 3: extract only components with measured independent scaling or ownership needs: push, attachments, realtime gateway and call signalling.

A dedicated API Gateway is not a prerequisite while one backend API is deployed. Nginx/Ingress already provides edge routing, TLS, limits and headers. Introduce a gateway when multiple independently deployed APIs require central route policy, service authentication or version management.

## Go-live approval record

Before launch, record for every gate:

- owner;
- evidence link;
- test date;
- reviewer;
- accepted residual risk;
- rollback procedure.

Do not replace evidence with a generic “production-ready” label.
