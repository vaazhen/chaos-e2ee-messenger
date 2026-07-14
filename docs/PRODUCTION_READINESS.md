# Production Readiness Tracking

| ID | Проблема | Приоритет | Статус | Изменённые файлы | Тесты |
| -- | -------- | --------- | ------ | ---------------- | ----- |
| P0-1 | AES-GCM AAD envelope binding | P0 | VERIFIED | crypto-engine.ts | crypto-engine.test.js |
| P0-2 | STOMP after DB commit | P0 | VERIFIED | RealtimeEventConsumer.java | RealtimeEventConsumerTest.java |
| P0-3 | Dedup after successful route | P0 | VERIFIED | RealtimeEventConsumer.java | RealtimeEventConsumerTest.java |
| P0-4 | Recovery cursor gap-safe | P0 | FIXED | useWebSocket.js | useWebSocket.test.jsx |
| P0-5 | Cursor after durable apply | P0 | FIXED | useWebSocket.js | useWebSocket.test.jsx |
| P0-6 | Honest backup semantics | P0 | VERIFIED | BackupModal.jsx, BackupSection.jsx, ProfileModal.jsx | - |
| P0-7 | Passphrase never sent | P0 | VERIFIED | api.js, BackupController.java, BackupService.java | BackupServiceTest.java |
| P0-8 | Device linking step-up | P0 | VERIFIED | DeviceRegistrationTokenService.java, AuthService.java | DeviceRegistrationTokenServiceTest.java |
| P0-9 | K8s deploy docs | P0 | VERIFIED | kustomization.yaml | - |
| P0-10 | CI fail-closed | P0 | OPEN | ci.yml | - |
| AUTH-1 | Atomic refresh rotation | P1 | VERIFIED | RefreshTokenService.java | RefreshTokenServiceTest.java |
| FE-1 | TypeScript infrastructure | P1 | FIXED | tsconfig.json, protocol.ts, crypto-engine.ts | - |
| RT-3 | Sequential event queue | P1 | OPEN | useWebSocket.js | - |
| RT-4 | FULL_RESYNC state machine | P1 | OPEN | useWebSocket.js | - |
| RT-5 | Dedup after durable apply | P0 | OPEN | useWebSocket.js | - |
| CICD-3 | Trivy gate blocks release | P0 | OPEN | ci.yml | - |
| CICD-4 | Kubeconfig required for master | P0 | OPEN | ci.yml | - |
| CICD-5 | Production depends on staging | P0 | IN_PROGRESS | ci.yml | - |
| TS-1 | Mandatory typecheck in CI | P1 | OPEN | ci.yml, package.json | - |
| TS-2 | Type critical crypto path | P1 | OPEN | crypto-engine.ts | - |
| SEC-3 | AAD protocol v2 | P1 | VERIFIED | crypto-engine.ts | crypto-engine.test.js |
| DEV-3 | Session-bound strong-auth | P1 | VERIFIED | DeviceRegistrationTokenService.java | DeviceRegistrationTokenServiceTest.java |
| K8S-3 | Overlays structure | P1 | VERIFIED | k8s/overlays/ | - |
| K8S-4 | Secret management | P1 | VERIFIED | secret.example.yaml | - |
| BE-2 | Integration tests outbox/Kafka | P1 | OPEN | - | - |
| OBS-1 | Runbooks | P1 | VERIFIED | docs/runbooks/ | - |
| OBS-2 | Alert rules | P1 | VERIFIED | infra/prometheus/alerts.yml | - |
| ATT-3 | Streaming attachments | P1 | VERIFIED | AttachmentController.java | - |
| CALL-2 | Calls feature flag | P1 | VERIFIED | CallSignalingController.java | - |
| OBS-1 | Metrics, alerts, runbooks | P1 | OPEN | - | - |
| ATT-3 | Streaming attachments | P1 | OPEN | AttachmentStorageService.java | - |
