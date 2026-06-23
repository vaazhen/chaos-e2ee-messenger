<div align="center">

[Русская версия](README.ru.md) · [Quick Setup](SETUP_COMPLETE.md) · [Security Audit](SECURITY_AUDIT_EN.md) · [Issues](https://github.com/vaazhen/chaos-e2ee-messenger/issues)

<br/>

[![CI](https://github.com/vaazhen/chaos-e2ee-messenger/actions/workflows/ci.yml/badge.svg)](https://github.com/vaazhen/chaos-e2ee-messenger/actions/workflows/ci.yml)
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

<div align="center">
  <img src="docs/assets/screenshots/header.png" alt="Chaos Messenger" width="100%"/>
</div>

<br/>

<p align="center">
  <img src="docs/assets/screenshots/hero.png" alt="Chaos Messenger — chat list, conversation, devices" width="100%"/>
</p>

<p align="center">
  <sub>E2EE messenger · X3DH + Double Ratchet · multi-device · Spring Boot + React</sub>
</p>

---

## Overview

**Chaos Messenger** is a full-stack end-to-end encrypted messenger. The browser encrypts every message using a Signal-inspired protocol (X3DH + Double Ratchet), the backend routes encrypted envelopes per device, and the database stores only ciphertext. The server never sees plaintext.

```json
// What the server stores for every message
{ "ciphertext": "qzgHSg7z...", "nonce": "6KPcVjbp...", "messageIndex": 42 }
// What the chat preview shows to the server
{ "lastMessage": "[encrypted]" }
```

**Status:** production-ready MVP. The core E2EE protocol, realtime delivery, group chats, attachments, and self-destructing messages are fully implemented. Backed by comprehensive CI/CD, Docker Compose, and Kubernetes deployment manifests.

---

## Architecture

```
Browser (WebCrypto)
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
| Backend | Java 17 + Spring Boot 3.5 | Auth, device management, envelope storage, WebSocket routing, push |
| Database | PostgreSQL 16 + Flyway | Users, devices, chats, messages, envelopes, receipts (E2EE-blind) |
| Cache | Redis 7 | Refresh tokens, presence, unread counters, rate limits |
| Realtime | STOMP over WebSocket | Per-device message topics, status updates, typing, chat list sync |
| Proxy | Nginx | TLS termination, static serving, WebSocket upgrade, API routing |

---

## Features

| Category | Features |
|----------|----------|
| **E2EE** | X3DH session establishment · Double Ratchet per-message keys · AES-256-GCM · HKDF-SHA256 |
| **Multi-device** | Per-device identity keys · per-device encrypted envelopes · device management · revoke |
| **Auth** | Phone OTP · email/password · JWT access (24h) · refresh token rotation · Redis rate limits |
| **Chats** | Direct chats · saved messages · groups · Instagram-style requests |
| **Messaging** | Send · edit · soft delete · reply · reactions (👍❤️😂😮😢🔥) · read/delivered receipts · typing indicators |
| **Attachments** | AES-256-GCM encrypted file/image/voice · canvas-based image compression · local encrypted storage |
| **Self-destruct** | Configurable TTL · scheduled cleanup · countdown UI |
| **Realtime** | SockJS / WebSocket / STOMP · device topics · chat list sync · presence heartbeats |
| **Monitoring** | Spring Actuator · Prometheus metrics · Grafana dashboard (pre-built) |
| **Deployment** | Docker Compose (full stack) · Kubernetes manifests · GitHub Actions CI/CD |

---

## Quick Start

### Docker Compose (recommended)

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
# 1. Infrastructure
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

### Kubernetes

```bash
kubectl apply -k k8s/
```

Requires: PostgreSQL password and JWT secret in `k8s/secret.yaml`, Ingress host in `k8s/ingress.yaml`.

### Requirements

- Java 17+, Node.js 18+, Docker
- For K8s: kubectl, kustomize, cluster (minikube / managed)

---

## Local Services

| Service | URL |
|---------|-----|
| App | http://localhost:80 (Docker) / http://localhost:5173 (dev) |
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| OpenAPI JSON | http://localhost:8080/api-docs |
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
- **50 X25519 one-time prekeys** — uploaded to server for future sessions

Private keys stay in `localStorage` (encrypted by browser profile). The server stores only public key material.

### 2. Session Establishment (X3DH-like)

When Alice sends the first message to Bob:

1. Resolve Bob's devices via `POST /api/crypto/resolve-chat-devices`
2. Reserve a one-time prekey (atomic `FOR UPDATE` in PostgreSQL)
3. Verify signed prekey signature (ECDSA P-256)
4. Compute 3–4 X25519 DH operations:
   - `DH(identity_private, signed_prekey_public)`
   - `DH(ephemeral_private, identity_public)`
   - `DH(ephemeral_private, signed_prekey_public)`
   - `DH(ephemeral_private, one_time_prekey_public)` (if available)
5. Derive shared secret: `HKDF-SHA256(DH1 || DH2 || DH3 || DH4)`
6. Initialize Double Ratchet with first DH ratchet step

### 3. Double Ratchet

Per the Signal specification:

- **Symmetric ratchet:**  
  `messageKey = HMAC-SHA256(chainKey, 0x01)`  
  `nextChainKey = HMAC-SHA256(chainKey, 0x02)`
- **DH ratchet:** on direction change, new X25519 keypair → `KDF_RK(oldRoot, DH(ratchetKey, newDHr))` → new root + chain keys
- **Encryption:** AES-256-GCM with fresh 12-byte nonce per message
- **Skipped message keys:** up to 2000 per DH ratchet step, 4000 total, for out-of-order delivery

All operations use the Web Crypto API (`crypto.subtle`) — pure browser crypto, no wasm or JS libraries.

### 4. Per-Device Envelopes

One message from Alice → N encrypted envelopes (one per target device + one for Alice's own devices for cross-device sync). Each envelope is routed via a per-device WebSocket topic:

```
/topic/devices/{deviceId}/chats/{chatId}
```

---

## Deployment

### Docker Compose (full stack)

```bash
docker compose up -d
# Or with custom env:
JWT_SECRET=... POSTGRES_PASSWORD=... docker compose up -d
```

[See docker-compose.yml](docker-compose.yml) for the full configuration including:
- PostgreSQL 16 with healthcheck
- Redis 7 with healthcheck
- Backend with Spring Boot prod profile
- Frontend served by Nginx
- Shared network and volumes

### Kubernetes

Ready-to-apply manifests in [k8s/](k8s/):

```bash
# Edit secrets first
kubectl apply -k k8s/
```

Includes: StatefulSet (Postgres), Deployments (Redis, Backend ×2, Frontend ×2), Services, Ingress with cert-manager annotations, ConfigMap, Prometheus annotations.

### CI/CD

[GitHub Actions workflow](.github/workflows/ci.yml) automates:
1. Backend build + test (Maven)
2. Frontend build + test (Vitest)
3. Docker image build + push to `ghcr.io` (cached layers)
4. Kubernetes deployment with rollout status check

---

## Load Test Results

Local k6 benchmarks (8 GB RAM Windows machine):

| Scenario | Requests | Failed | p95 send | p95 timeline | p95 read |
|----------|---------:|------:|---------:|-------------:|---------:|
| Baseline 5 VU | 2,995 | 0 | 93ms | 43ms | 50ms |
| Normal 25 VU | 35,549 | 0 | 151ms | 89ms | 106ms |
| Spike 50 VU | 76,816 | 0 | 428ms | 375ms | 394ms |
| Soak 5 VU / 30m | 250,795 | 0 | 81ms | 44ms | 60ms |
| **Total** | **576,719** | **0** | — | — | — |

WebSocket hold: 1,000 concurrent connections validated with 0 errors.

---

## Project Structure

```
chaos-messenger_e2ee/
├── backend/            # Spring Boot (Maven)
│   ├── src/            # 33 Flyway migrations, crypto, message, chat, auth
│   ├── Dockerfile      # Multi-stage JRE build
│   └── docker-compose*.yml
├── frontend/           # React 18 + Vite
│   ├── src/            # crypto-engine.js (Double Ratchet), hooks, components
│   ├── Dockerfile      # Multi-stage nginx build
│   └── nginx.conf      # Reverse proxy config
├── k8s/                # Kubernetes manifests (kustomize)
├── docker-compose.yml  # Root full-stack orchestration
├── .github/workflows/  # CI/CD pipeline
└── docs/               # Architecture diagrams, screenshots
```

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **WebCrypto over libsodium/WASM** | Zero native dependencies, no bundle bloat, audited browser implementation |
| **Per-device envelopes** | Each device has its own encrypted ciphertext; message loss is isolated per device |
| **STOMP over raw WebSocket** | Built-in pub/sub topics, frame routing, SockJS fallback |
| **PostgreSQL over DynamoDB/Cassandra** | Foreign keys, migrations, JSON reactions, transactional envelope persistence |
| **In-memory broker** | Suitable for MVP; horizontal scaling needs external broker relay |

---

## Known Limitations

- Double Ratchet needs more edge-case test vectors
- Push notifications: endpoint storage exists, Web Push delivery not yet implemented
- Attachments stored on local filesystem (not S3/GCS)
- Spring SimpleBroker is not horizontally scalable out of the box
- No safety numbers / device verification UI
- XSS in browser localStorage would leak all keys (mitigated by CSP + short-lived JWTs)

---

## Articles

- [Building an End-to-End Encrypted Messenger with Spring Boot and WebCrypto](https://dev.to/vaazhen/i-built-an-end-to-end-encrypted-messenger-with-spring-boot-and-webcrypto-1if5)
- [Habr article / discussion](https://habr.com/ru/articles/1030854/)

---

## License

Apache License 2.0. See [LICENSE](LICENSE).
