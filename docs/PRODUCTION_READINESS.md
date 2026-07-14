# Production Readiness Tracking

| ID | Проблема | Приоритет | Статус | Изменённые файлы | Проверка |
|---|---|---:|---|---|---|
| P0-1 | AES-GCM AAD envelope binding | P0 | VERIFIED | `crypto-engine.ts` | crypto tests |
| P0-2 | STOMP only after DB commit | P0 | VERIFIED | `RealtimeEventConsumer.java` | backend tests |
| P0-3 | Realtime backend dedupe after successful processing | P0 | VERIFIED | `RealtimeEventConsumer.java` | backend tests |
| RT-3 | Sequential client event queue | P0 | VERIFIED | `useWebSocket.js` | `useWebSocket.test.jsx` |
| RT-4 | Failed recovery event replay | P0 | VERIFIED | `useWebSocket.js` | retry test |
| RT-5 | Cursor after durable client apply | P0 | VERIFIED | `useWebSocket.js` | ordering/cursor tests |
| RT-6 | Bounded full-resync state | P0 | FIXED | `useWebSocket.js` | unit tests; browser E2E pending |
| P0-6 | Honest backup semantics | P0 | VERIFIED | backup UI | frontend tests |
| P0-7 | Backup passphrase remains client-side | P0 | VERIFIED | API/backend backup files | backend tests |
| P0-8 | Device linking step-up | P0 | VERIFIED | auth services | backend tests |
| AUTH-1 | Atomic refresh rotation | P1 | VERIFIED | `RefreshTokenService.java` | backend tests |
| SEC-3 | AAD protocol v2 and 64-bit chat ID | P1 | VERIFIED | `crypto-engine.ts` | crypto tests |
| TS-1 | Real TypeScript gate includes crypto engine | P1 | VERIFIED | `tsconfig.json`, CI | local typecheck |
| TS-2 | Protocol DTO strict gate | P1 | VERIFIED | `tsconfig.protocol.json` | local typecheck |
| TS-3 | Full strict typing of crypto engine | P1 | IN_PROGRESS | `crypto-engine.ts` | migration gate only |
| CICD-1 | Trivy blocking gate | P0 | VERIFIED | `ci.yml` | workflow audit |
| CICD-2 | Explicit CodeQL builds | P1 | FIXED | `ci.yml` | CI run pending |
| CICD-3 | Production depends on deployed staging | P0 | VERIFIED | `ci.yml` | workflow output gate |
| CICD-4 | Mandatory staging smoke test when enabled | P0 | VERIFIED | `ci.yml` | workflow audit |
| K8S-1 | Example secret excluded from kustomization | P0 | VERIFIED | `kustomization.yaml` | static audit |
| K8S-2 | Tracked placeholder secret removed | P0 | VERIFIED | `.gitignore`, `k8s/secret.yaml` removed | static audit |
| OBS-1 | Metrics, alerts and runbooks | P1 | VERIFIED | `infra`, `docs/runbooks` | static audit |
| ATT-1 | Attachment hardening | P1 | FIXED | attachment backend | backend validation pending |
| CALL-1 | Calls behind feature flag | P1 | VERIFIED | signaling controller | static audit |
| BE-CI-1 | Full Maven verify | P0 | BLOCKED | backend | requires CI/network |
