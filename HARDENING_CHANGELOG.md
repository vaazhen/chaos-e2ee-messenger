# Security and Production Hardening Changelog

Date: **2026-07-12**

This changelog documents the hardening performed on the supplied source archive. It is intentionally scoped to implemented changes and does not claim an independent security certification.

## Client cryptography and storage

- Added encrypted IndexedDB-backed secure storage.
- Migrated private identity, pre-key, ratchet and trust records out of `localStorage`.
- Removed access and refresh tokens from browser storage; access JWT is memory-only.
- Added legacy-secret cleanup/migration.
- Added cross-tab/concurrent ratchet mutation locking.
- Added per-device trust states: `UNVERIFIED`, `VERIFIED`, `KEY_CHANGED`.
- Added encrypted-operation blocking after an unexpected verified identity-key change.
- Updated backup/restore to read and write secure E2EE state.
- Increased password backup PBKDF2 work factor and retained AES-GCM authenticated encryption.
- Removed a duplicate `signedPreKeyId` envelope field.

## Authentication and sessions

- Reduced default access-token lifetime to 15 minutes.
- Added JWT issuer, audience, `jti`, token type, session ID and not-before validation data.
- Moved browser refresh tokens to host-only Secure/HttpOnly/SameSite=Strict cookies.
- Store only refresh-token SHA-256 digests in Redis.
- Added token families, rotation, reuse detection and family revocation.
- Added no-store/no-cache authentication response headers.
- Added Redis-backed credential throttling.
- Added password length validation.
- Changed phone verification to accept only the latest issued OTP, preventing fallback to an older unused code after a newer code is consumed.
- Added strict phone/OTP input validation.
- Hashed phone identifiers in Redis rate-limit keys and application logs.
- Removed push fallback logging of endpoint and notification content.

## Realtime and delivery

- Added `eventId` to message, status, request, chat-list and user-status realtime payloads.
- Added client-side bounded event deduplication.
- Changed backend deduplication so an event is recorded only after successful fanout; failed events remain retryable.
- Added tests for successful deduplication and retry after parse/fanout failure.

## Attachments

- Added strict UUID validation and canonical path containment.
- Added configurable maximum attachment size.
- Added temporary-file writes and atomic finalisation where supported.
- Added cleanup after database failure or transaction rollback.
- Added no-store/nosniff download headers and safer media type handling.

## Browser edge security

- Added CSP, nosniff, frame denial, referrer, permissions, COOP and CORP headers.
- Added separate authentication/API rate limits and connection limits.
- Added upload-size and proxy timeout limits.
- Removed public routes to Actuator and API documentation.
- Corrected Nginx non-root port and healthcheck.

## Electron

- Enabled renderer sandbox and retained context isolation with Node integration disabled.
- Added trusted renderer checks to every IPC handler.
- Added IPC payload and file-size validation.
- Restricted external navigation to HTTPS.
- Denied arbitrary navigation, popups and webviews.
- Added permission request policy and Electron CSP/security headers.
- Added fail-fast validation for absolute HTTPS/WSS packaged endpoints.
- Corrected packaged Electron asset paths by switching Vite to a relative base in `electron` mode.
- Added same-origin web defaults and Vite development proxies for `/api` and `/ws`.
- Removed verbose production crypto/realtime metadata logging while retaining development diagnostics.

## Backend and deployment

- Added fail-fast CORS/WebSocket origin parsing: empty configuration and global credentialed wildcards are rejected.
- Separated management/Actuator traffic onto port 9091.
- Disabled public Prometheus access through application security and Ingress.
- Added Redis password support in the Compose stack.
- Corrected Kubernetes secret-to-Spring environment mapping and authenticated Redis dev probes.
- Corrected Compose Caddy, backend healthcheck and Prometheus target ports.
- Removed forced Caddy internal TLS so real domains can receive public certificates.
- Pinned previously floating monitoring image versions.
- Moved single-node Kubernetes PostgreSQL/Redis examples into `k8s/dev/`.
- Added non-root/read-only/seccomp/drop-capabilities pod security.
- Added resource limits, HPA, PDB and topology spreading.
- Replaced committed Kubernetes secret material with an example template.
- Updated backend artifact version to 1.0.0.

## CI/CD

- Backend gate uses Maven `verify`.
- Frontend gate runs lint, tests, coverage and production build.
- Added dependency review and CodeQL.
- Added container vulnerability scanning.
- Added SBOM/provenance generation and immutable image tags.
- Restricted production deployment to version tags and protected environment approval.
- Removed swallowed rollout failures.
- Replaced non-deterministic `latest` kubectl installation logic with the runner-provided kubectl/kustomize path.

## Test additions

New or expanded tests cover:

- secure storage migration and secret removal;
- X3DH/Double Ratchet bidirectional operation;
- concurrent ratchet sends and message-index uniqueness;
- out-of-order delivery through skipped message keys;
- identity verification and key-change blocking;
- multi-device Safety Number UI;
- memory-only token behaviour;
- HttpOnly refresh cookie contract;
- refresh rotation/reuse and credential rate limiting;
- latest-only OTP verification, phone-key hashing and CORS origin validation;
- attachment path/size/rollback safety;
- WebSocket at-least-once deduplication;
- realtime backend retry-safe deduplication;
- Electron endpoint configuration.
