<div align="center">

[Русская версия](README.ru.md) · [Quick Setup](SETUP_COMPLETE.md) · [Security Audit](SECURITY_AUDIT_EN.md) · [Issues](https://github.com/vaazhen/chaos-e2ee-messenger/issues)

<br/>

[![CI](https://github.com/vaazhen/chaos-e2ee-messenger/actions/workflows/ci.yml/badge.svg)](https://github.com/vaazhen/chaos-e2ee-messenger/actions/workflows/ci.yml)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/k8s-manifests-326CE5?logo=kubernetes&logoColor=white)](k8s/)
[![Java](https://img.shields.io/badge/Java-17-orange?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-brightgreen?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis&logoColor=white)](https://redis.io/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

</div>

---

## Overview

**Chaos Messenger** is a full-stack end-to-end encrypted messenger with desktop apps. The browser encrypts every message using a Signal-inspired protocol (X3DH + Double Ratchet), the backend routes encrypted envelopes per device, and the database stores only ciphertext. The server never sees plaintext.

```json
{ "ciphertext": "qzgHSg7z...", "nonce": "6KPcVjbp...", "messageIndex": 42 }
{ "lastMessage": "[encrypted]" }
```

Available as: **Web app**, **Desktop (Electron)** for Windows/macOS/Linux.

---

## Architecture

```
Browser / Electron (WebCrypto)
    │
    ├── HTTPS/REST (JSON) ──► Spring Boot ──► PostgreSQL
    │   Auth: Bearer <JWT>                      ▲
    │   Device: X-Device-Id                     │
    │                                            │
    └── WebSocket/STOMP ◄────────────────────────┘
         (SockJS fallback)
```

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| Client | React 18 + WebCrypto API | Key generation, X3DH session setup, Double Ratchet encrypt/decrypt |
| Desktop | Electron 33 | Native window, system tray, notifications, file dialogs, auto-update |
| Backend | Java 17 + Spring Boot 3.5 | Auth, device management, envelope storage, WebSocket routing |
| Database | PostgreSQL 16 + Flyway | Users, devices, chats, messages, envelopes, receipts (E2EE-blind) |
| Cache | Redis 7 | Refresh tokens, presence, unread counters, rate limits |
| Proxy | Nginx | TLS termination, static serving, WebSocket upgrade, API routing |

---

## Desktop App (Electron)

The desktop build wraps the React frontend in a native Chromium window with:

- **System tray** — minimize to tray, background notifications
- **Native notifications** — OS-native message alerts
- **File dialogs** — native save/open for encrypted attachments
- **Single instance** — prevents duplicate app launches
- **Window state** — remembers position, size, maximized state
- **Cross-platform** — Windows (NSIS installer), macOS (DMG), Linux (AppImage)

### Build desktop app

```bash
cd frontend

# Install dependencies (first time)
npm install

# Development (hot reload in Electron window)
npm run electron:dev

# Production build for Windows
npm run electron:build:win

# Production build for current platform
npm run electron:build
```

The installer will be in `frontend/release/`.

---

## Features

| Category | Features |
|----------|----------|
| **E2EE** | X3DH session establishment · Double Ratchet per-message keys · AES-256-GCM · HKDF-SHA256 |
| **Multi-device** | Per-device identity keys · per-device encrypted envelopes · device management · revoke |
| **Auth** | Phone OTP · email/password · JWT access (24h) · refresh token rotation · Redis rate limits |
| **Chats** | Direct chats · saved messages · groups · Instagram-style requests |
| **Messaging** | Send · edit · soft delete · reply · reactions · read/delivered receipts · typing indicators |
| **Attachments** | AES-256-GCM encrypted files · canvas-based image compression · voice messages |
| **Self-destruct** | Configurable TTL · scheduled cleanup · countdown UI |
| **Realtime** | SockJS / WebSocket / STOMP · device topics · chat list sync · presence heartbeats |
| **Desktop** | Electron app · system tray · native notifications · file dialogs · single instance lock |
| **Monitoring** | Spring Actuator · Prometheus metrics · Grafana dashboard (pre-built) |
| **Deployment** | Docker Compose · Kubernetes manifests · GitHub Actions CI/CD |

---

## Quick Start

### Docker Compose (full stack)

```bash
git clone https://github.com/vaazhen/chaos-e2ee-messenger.git
cd chaos-e2ee-messenger
echo JWT_SECRET=your-256-bit-secret-key-change-me > .env
echo POSTGRES_PASSWORD=change-me >> .env
docker compose up -d
```

Open: [http://localhost](http://localhost)

### Manual development

```bash
# 1. Infrastructure (PostgreSQL + Redis)
cd backend
docker compose -f docker-compose.dev.yml up -d

# 2. Backend
./mvnw spring-boot:run

# 3. Frontend
cd frontend
npm install
npm run dev
```

Open: [http://localhost:5173](http://localhost:5173)

In dev mode, SMS codes are printed in backend logs. Test account: `+79999999999` / code `123456`.

### Desktop app (production build)

```bash
cd frontend
npm install
npm run electron:build:win
```

### Kubernetes

```bash
kubectl apply -k k8s/
```

### Requirements

- Java 17+, Node.js 18+, Docker

---

## Local Services

| Service | URL |
|---------|-----|
| Web App | http://localhost:5173 |
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| Health | http://localhost:8080/actuator/health |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 (admin / admin) |

---

## E2EE Protocol

### 1. Device Registration

Each browser generates on first launch:
- **X25519 identity keypair** — long-term device identity
- **ECDSA P-256 signing keypair** — signs the signed prekey
- **X25519 signed prekey** — signed with signing key, published to server
- **50 X25519 one-time prekeys** — for future sessions

Private keys stay in `localStorage`. The server stores only public key material.

### 2. Session Establishment (X3DH-like)

When Alice sends the first message to Bob:

1. Resolve Bob's devices via `POST /api/crypto/resolve-chat-devices`
2. Reserve a one-time prekey (atomic `FOR UPDATE` in PostgreSQL)
3. Verify signed prekey signature (ECDSA P-256)
4. Compute 3–4 X25519 DH operations
5. Derive shared secret: `HKDF-SHA256(DH1 || DH2 || DH3 || DH4)`
6. Initialize Double Ratchet with first DH ratchet step

### 3. Double Ratchet

Per the Signal specification:

- **Symmetric ratchet:** `messageKey = HMAC-SHA256(chainKey, 0x01)`, `nextChainKey = HMAC-SHA256(chainKey, 0x02)`
- **DH ratchet:** on direction change, new X25519 keypair → `KDF_RK(oldRoot, DH(ratchetKey, newDHr))`
- **Encryption:** AES-256-GCM with fresh 12-byte nonce per message
- **Skipped message keys:** up to 2000 per DH ratchet step, 4000 total

All operations use the Web Crypto API (`crypto.subtle`) — pure browser crypto.

### 4. Per-Device Envelopes

One message → N encrypted envelopes (one per target device + one for own devices). Each envelope is routed via a per-device WebSocket topic:

```
/topic/devices/{deviceId}/chats/{chatId}
```

---

## Deployment

### Docker Compose

```bash
docker compose up -d
```

Services: PostgreSQL 16, Redis 7, Backend (Spring Boot), Frontend (Nginx). Healthchecks on all services.

### Kubernetes

```bash
kubectl apply -k k8s/
```

Includes: StatefulSet (Postgres, 10GB), Deployments (Redis, Backend ×2, Frontend ×2), Services, Ingress with cert-manager, Prometheus annotations.

### CI/CD

GitHub Actions: test → Docker build/push → K8s deploy with rollout status.

---

## Load Test Results

Local k6 benchmarks (8 GB RAM Windows):

| Scenario | Requests | Failed | p95 send | p95 timeline |
|----------|---------:|------:|---------:|-------------:|
| Baseline 5 VU | 2,995 | 0 | 93ms | 43ms |
| Normal 25 VU | 35,549 | 0 | 151ms | 89ms |
| Spike 50 VU | 76,816 | 0 | 428ms | 375ms |
| Soak 5 VU / 30m | 250,795 | 0 | 81ms | 44ms |
| **Total** | **576,719** | **0** | — | — |

WebSocket: 1,000 concurrent connections, 0 errors.

---

## Project Structure

```
chaos-messenger_e2ee/
├── backend/              # Spring Boot (Maven)
│   ├── src/              # 33 Flyway migrations, crypto, message, chat, auth
│   ├── Dockerfile        # Multi-stage JRE build
│   └── docker-compose*.yml
├── frontend/             # React 18 + Vite + Electron
│   ├── src/              # crypto-engine.js (Double Ratchet), hooks, components
│   ├── electron/         # Electron main process, preload
│   │   ├── main.js       # Window, tray, IPC, auto-update
│   │   └── preload.js    # Secure context bridge
│   ├── Dockerfile        # Multi-stage nginx build
│   └── nginx.conf        # Reverse proxy
├── k8s/                  # Kubernetes manifests (kustomize)
├── docker-compose.yml    # Root full-stack orchestration
└── .github/workflows/    # CI/CD pipeline
```

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **WebCrypto over libsodium/WASM** | Zero native dependencies, no bundle bloat, audited browser implementation |
| **Per-device envelopes** | Message loss isolated per device |
| **STOMP over raw WebSocket** | Built-in pub/sub topics, frame routing, SockJS fallback |
| **Electron over Tauri** | WebCrypto guaranteed, zero Rust toolchain, proven cross-platform |
| **PostgreSQL over NoSQL** | Foreign keys, migrations, JSON reactions, transactional envelopes |
| **In-memory broker** | MVP-appropriate; horizontal scaling needs external broker relay |

---

## Known Limitations

- Double Ratchet needs more edge-case test vectors
- Push notifications: endpoint storage exists, Web Push delivery not yet implemented
- Attachments stored on local filesystem (not S3/GCS)
- Spring SimpleBroker is not horizontally scalable
- No safety numbers / device verification UI
- XSS in localStorage would leak all keys (mitigated by CSP + short-lived JWTs)

---

## Articles

- [Building an End-to-End Encrypted Messenger with Spring Boot and WebCrypto](https://dev.to/vaazhen/i-built-an-end-to-end-encrypted-messenger-with-spring-boot-and-webcrypto-1if5)
- [Habr article / discussion](https://habr.com/ru/articles/1030854/)

---

## License

Apache License 2.0. See [LICENSE](LICENSE).
