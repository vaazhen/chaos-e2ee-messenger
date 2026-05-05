<div align="center">

[Русская версия](README.ru.md) · [Quick Setup](SETUP_COMPLETE.md) · [Security Audit](SECURITY_AUDIT_EN.md)

<br/>

[![CI](https://github.com/vaazhen/chaos-messenger/actions/workflows/ci.yml/badge.svg)](https://github.com/vaazhen/chaos-messenger/actions/workflows/ci.yml)
[![Java](https://img.shields.io/badge/Java-17-orange?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-brightgreen?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
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
  <sub>Chat list with unread badges · Live conversation with read receipts ✓✓ · Multi-device E2EE management</sub>
</p>

---

## Article

I wrote a technical breakdown of the project on DEV:

[Building an End-to-End Encrypted Messenger with Spring Boot and WebCrypto](https://dev.to/vaazhen/i-built-an-end-to-end-encrypted-messenger-with-spring-boot-and-webcrypto-1if5)

The article explains the main architecture decisions behind Chaos Messenger: X3DH session setup, symmetric ratchet, encrypted per-device envelopes, WebSocket delivery, multi-device routing, and the limitations of browser-based E2EE.

---

## What is this

**Chaos Messenger** is a full-stack realtime messenger where end-to-end encryption is not a marketing claim — it is a verifiable architectural property.

Open DevTools. Send a message. The server receives this:

```json
{
  "envelope": {
    "ciphertext": "qzgHSg7zbwU6h8j8RqCPUYBWHJLi78eR9C0tj9I=",
    "nonce": "6KPcVjbpM4FUB0Vz",
    "senderIdentityPublicKey": "B4pERe0xKmSdiQPR+kLWWmI0nloC8Za3RBTg+occHF0=",
    "targetDeviceId": "device-2aa3ae0e-ee08-4261-aa09-7d8f800b61e9"
  }
}
```

Ask the server what the last message says:

```json
{ "lastMessage": "[encrypted]" }
```

Not `***`. Not `[hidden]`. The server returns `[encrypted]` because it genuinely has nothing else to return.

**Stack:** Spring Boot 3 · React 18 · WebSocket/STOMP · X3DH · Symmetric Ratchet · AES-GCM · WebCrypto API

---

## Architecture

> Three layers — strictly separated responsibilities. The client encrypts, the server routes, the database persists blobs.

<p align="center">
  <img src="docs/assets/screenshots/architecture.png" alt="Architecture: Browser · Spring Boot Backend · Data & Observability" width="100%"/>
</p>

| Layer | Responsibility |
|---|---|
| **Browser** | Create keys · Encrypt · Decrypt · Store device identity |
| **Backend** | Authenticate · Route · Store envelopes · Deliver over WebSocket |
| **PostgreSQL** | Users · devices · chats · encrypted envelopes |
| **Redis** | Refresh tokens · online presence · SMS rate limits |

---

## How E2EE works

### Step 1 — X3DH key exchange

> Alice fetches Bob's public prekey bundle from the server and derives a shared secret locally. The server never sees the secret.

<p align="center">
  <img src="docs/assets/screenshots/e2ee-flow.png" alt="E2EE flow: Alice's device · Server · Bob's device" width="100%"/>
</p>

When you open a conversation for the first time, your device runs [Extended Triple Diffie-Hellman (X3DH)](https://signal.org/docs/specifications/x3dh/) against the recipient's prekey bundle. A shared secret is derived locally — it never leaves your device. The server provides public keys but has no way to compute the secret.

### Step 2 — Symmetric Ratchet + AES-GCM

> Every message gets its own unique encryption key, then that key is discarded. Compromising one key reveals nothing about the rest.

<p align="center">
  <img src="docs/assets/screenshots/ratchet.png" alt="Symmetric Ratchet: chainKey evolves, unique messageKey per message" width="100%"/>
</p>

After session setup, each message key is derived by advancing a ratchet chain:

```
nextChainKey = HMAC-SHA256(chainKey, 0x02)
messageKey   = HMAC-SHA256(chainKey, 0x01)
```

`messageKey` encrypts exactly one message with AES-GCM, then is discarded. This provides **forward secrecy per message**.

### Step 3 — Blind fanout

The server receives an opaque ciphertext envelope and routes one copy to every registered device of the recipient over WebSocket. It never decrypts, never re-encrypts — it is a **blind router**.

> **Scope note.** This is a *symmetric* ratchet — not the full [Double Ratchet](https://signal.org/docs/specifications/doubleratchet/) from Signal Protocol. The DH ratchet step (break-in recovery) is the first item on the [roadmap](#roadmap) and is covered in the [Security Audit](SECURITY_AUDIT_EN.md).

---

## Features

| | |
|---|---|
| **E2EE** | X3DH · Symmetric Ratchet · AES-GCM · WebCrypto · zero external crypto deps |
| **Multi-device** | Separate envelope per device · Device management UI · Revoke access |
| **Auth** | Phone + SMS OTP · Email + password · JWT access/refresh · Redis rate limiting |
| **Messaging** | Direct and group chats · Realtime via WebSocket/STOMP · Typing indicator |
| **Group admin** | Group roles in payload (`OWNER/ADMIN/MODERATOR/MEMBER`) · Write/edit/invite policy fields |
| **Message ops** | Reply · Edit · Soft delete · Photo attachments · Read receipts ✓✓ · Presence · User search |
| **Backend** | Spring Boot 3 · PostgreSQL 16 · Flyway migrations (V1–V29) · Redis 7 · Docker Compose |
| **Observability** | Actuator · Prometheus · Grafana (pre-provisioned, zero config) |
| **Tests** | 24 backend (Testcontainers) · 12 frontend (Vitest) · E2E (Playwright) |
| **DX** | GitHub Actions CI · OpenAPI 3.1 · Swagger UI · one-command startup |

---

## Onboarding flow

> Phone authentication → SMS verification → profile setup → start chatting. The whole flow takes under a minute.

<p align="center">
  <img src="docs/assets/screenshots/screens-onboarding.png" alt="Onboarding: phone auth · SMS verification · profile setup · new chat" width="100%"/>
</p>

---

## Quick Start

```bash
git clone https://github.com/vaazhen/chaos-messenger.git
cd chaos-messenger
```

**One command:**

```bash
./START.sh        # macOS / Linux
START.bat         # Windows
```

**Or manually:**

```bash
# 1. Infrastructure
cd backend && docker compose -f docker-compose.dev.yml up -d

# 2. Backend
mvn spring-boot:run

# 3. Frontend (new terminal)
cd frontend && npm install && npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)**

> In dev mode, SMS codes appear in backend logs — no SMS provider needed.

**Requirements:** Java 17+ · Maven 3.8+ · Node.js 18+ · Docker + Compose

---

## Local URLs

| Service | URL |
|---|---|
| App | http://localhost:5173 |
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| OpenAPI JSON | http://localhost:8080/api-docs |
| Health | http://localhost:8080/actuator/health |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 · `admin / admin` |

---

## API

Every protected endpoint requires `Authorization: Bearer <jwt>` and `X-Device-Id: <uuid>`.

| Group | Description |
|---|---|
| **Auth** | Phone OTP · Email login · JWT refresh · Logout |
| **Devices** | Register · Upload prekeys · Rotate signed prekey · List |
| **Crypto** | Fetch prekey bundle for X3DH session init |
| **Chats** | Create direct/group · List · Info |
| **Messages** | Send · Edit · Delete · Read receipts |
| **Profile** | Get · Update · Avatar · Username check |
| **Users** | Search by username |

### Group chats — roles and policies

Roles are stored per participant in `chat_participants.role`. Order of authority (highest to lowest): **`OWNER` → `ADMIN` → `MODERATOR` → `MEMBER`**.

| Role | Typical use |
|------|-------------|
| **OWNER** | Creates the group; sole role that can change permission policies (`whoCan*`) or archive the group; can transfer ownership (previous owner becomes `ADMIN`). |
| **ADMIN** | Can invite (per `whoCanInvite`), edit group profile (per `whoCanEditInfo`), change roles (with restrictions vs other admins), remove/mute/ban members and moderators; cannot target the owner. |
| **MODERATOR** | Can mute/ban/remove **members only**; cannot change roles. |
| **MEMBER** | Default for invites; no moderation or role changes. |

Policies on the `chats` row control who may perform an action. The API accepts these string values (case-insensitive):

| Field | Allowed values | Meaning |
|-------|----------------|---------|
| **`whoCanWrite`** | `ALL`, `MODERATORS`, `ADMINS`, `OWNER` | Who may send messages. `ALL` = any participant who is not muted/banned. |
| **`whoCanEditInfo`** | `ANYONE`, `MODERATORS`, `ADMINS`, `OWNER` | Who may change group name, avatar URL, and bio (`PATCH .../group/settings`). `ANYONE` = any participant meeting the minimum role. |
| **`whoCanInvite`** | `ANYONE`, `MODERATORS`, `ADMINS`, `OWNER` | Who may add members (`POST .../group/participants`). |

**Creation defaults:** creator is `OWNER`; invited users are `MEMBER`; `whoCanWrite=ALL`, `whoCanEditInfo=ADMINS`, `whoCanInvite=ADMINS`.

**`ChatResponse` (group):** includes `groupAvatarUrl`, `groupBio`, `whoCanWrite`, `whoCanEditInfo`, `whoCanInvite`, `myRole`, and `groupParticipants[]`. Each `GroupParticipantInfo` entry exposes `userId`, profile fields, `role`, `mutedUntil`, and `banned` (boolean).

### Group admin HTTP API

All routes are under `/api/chats`, require `Authorization: Bearer <jwt>` and `X-Device-Id`, and return `ChatResponse` where noted.

| Method | Path | Body / query | Notes |
|--------|------|--------------|--------|
| `POST` | `/group` | `{ "name": "Team", "memberIds": [2,3,4] }` | Creates group; returns `{ "chatId": ... }`. |
| `GET` | `/my` | `offset`, `limit` | Lists chats including group policy and participants. |
| `POST` | `/{chatId}/group/participants` | `{ "userIds": [5,6] }` | Invite members; gated by `whoCanInvite`. |
| `PATCH` | `/{chatId}/group/settings` | `{ "name"?, "avatarUrl"?, "bio"? }` | `null` = no change; empty string clears. Gated by `whoCanEditInfo`. |
| `PATCH` | `/{chatId}/group/participants/{participantUserId}/role` | `{ "role": "ADMIN" }` | Role changes: only owner may assign `OWNER` (transfer); admins/moderators have limits (see service rules). |
| `PATCH` | `/{chatId}/group/permissions` | `{ "whoCanWrite"?, "whoCanEditInfo"?, "whoCanInvite"? }` | **`OWNER` only.** |
| `DELETE` | `/{chatId}/group/participants/{participantUserId}` | — | Remove member; requires moderation rights (see below). |
| `DELETE` | `/{chatId}/group` | — | Archive group; **`OWNER` only** (soft-delete via `deleted_at`). |

**Direct chat requests** (unchanged; used alongside groups):

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/requests` | Pending direct requests for the current user. |
| `POST` | `/{chatId}/requests/accept` | Accept. |
| `POST` | `/{chatId}/requests/decline` | Decline. |

### Group moderation (mute / ban)

Moderation is stored on `chat_participants`: `muted_until`, `banned_at`, `banned_by`, `ban_reason` (see Flyway `V29`).

| Method | Path | Parameters | Behavior |
|--------|------|------------|----------|
| `POST` | `/{chatId}/group/participants/{participantUserId}/mute` | `minutes` (required, 1–43200) | Sets `muted_until = now + minutes`. |
| `DELETE` | `/{chatId}/group/participants/{participantUserId}/mute` | — | Clears mute. |
| `POST` | `/{chatId}/group/participants/{participantUserId}/ban` | `reason` (optional) | Sets ban; clears mute; stores optional reason (max 255 chars). |
| `DELETE` | `/{chatId}/group/participants/{participantUserId}/ban` | — | Removes ban. |

**Sending messages:** `MessageService` rejects sends from users who are **banned** (`"You are banned in this group"`) or **muted** (`"You are muted in this group"`). Self-moderation and targeting the **owner** are forbidden. **Moderators** may only moderate **members**; **admins** may moderate members and moderators, not owner/other admins.

Successful actions return an updated `ChatResponse` (mute/ban/unmute/unban) and notify chat list subscribers over WebSocket.

### Suggested contacts when creating groups

There is **no** backend recommendation endpoint. In the **new chat / new group** UI, while the group name query is empty or shorter than two characters, the client shows **suggested contacts derived from existing direct chats** (the other participant of each `direct` chat). Username search still uses `GET /api/users/search?q=...` when the user types two or more characters.

### Search and direct requests in the new-chat UI

- Explicit user search: `GET /api/users/search?q=...` (minimum query length enforced in the UI).
- Incoming direct requests appear via `GET /api/chats/requests`.

**WebSocket topics** (STOMP, JWT authenticated):

```
/topic/devices/{deviceId}/chats/{chatId}  ← per-device encrypted envelope
/topic/devices/{deviceId}/status          ← per-device status events
/topic/users/{username}/chats             ← chat list updates
/topic/chats/{chatId}/typing              ← typing events
/topic/user/status                        ← online presence
```

---

## Tests

```bash
cd backend && ./mvnw verify              # JUnit 5 + Testcontainers + JaCoCo checks
cd frontend && npm test                  # Vitest
cd frontend && npm run test:e2e          # Playwright
```

CI runs all three on every push and pull request.

---

## Project structure

```
chaos-messenger/
├── backend/src/main/java/ru/messenger/chaosmessenger/
│   ├── auth/          # Phone OTP · email · JWT
│   ├── chat/          # Chat management
│   ├── message/       # Messages · receipts · reactions · events
│   ├── crypto/        # Devices · prekeys · envelope fanout
│   ├── infra/         # WebSocket · security · filters
│   ├── user/          # Users · profiles
│   └── common/        # Errors · i18n · utils
├── backend/src/main/resources/
│   ├── db/migration/  # V1–V29 Flyway migrations (group admin, moderation, direct requests, profile bio)
│   ├── messages.properties      # EN error messages
│   └── messages_ru.properties   # RU error messages
├── frontend/src/
│   ├── crypto-engine.js   # X3DH + Ratchet + AES-GCM, zero deps
│   ├── components/        # AuthScreen · ChatList · MessageInput…
│   ├── hooks/             # useAuth · useChats · useMessages · useWebSocket
│   └── i18n/              # EN / RU
└── docs/assets/screenshots/
    ├── header.png           # Logo banner
    ├── hero.png             # Three-screen composite
    ├── architecture.png     # Architecture diagram
    ├── e2ee-flow.png        # X3DH + encryption flow
    ├── ratchet.png          # Symmetric ratchet diagram
    └── screens-onboarding.png  # Onboarding screens
```

---

## Environment variables

<details>
<summary>Backend + Frontend</summary>

**Backend:**
```env
JWT_SECRET=change-this-to-a-strong-32-plus-character-secret
JWT_EXPIRATION=86400000
CHAOS_CORS_ALLOWED_ORIGINS=http://localhost:5173
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/chaos_messenger
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379
```

**Frontend `.env`:**
```env
VITE_BACKEND_URL=http://localhost:8080
VITE_API_BASE=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080/ws
```
</details>

---

## Migrations and setup notes

On startup, **Spring Boot runs Flyway** against the configured PostgreSQL database and applies any pending scripts under `backend/src/main/resources/db/migration/` in version order. For an existing database, ensure the instance can reach the latest version (currently **`V29`**) before relying on group moderation or admin APIs.

Recent migrations:

| Version | File | Purpose |
|---------|------|---------|
| V26 | `V26__direct_chat_requests.sql` | Direct chat request lifecycle (`PENDING` / accept / decline). |
| V27 | `V27__add_user_bio.sql` | User profile `bio` field. |
| V28 | `V28__group_admin_features.sql` | Group roles; `who_can_write` / `who_can_edit_info` / `who_can_invite`; group `avatar_url`, `bio`, `deleted_at`; backfill `OWNER` per existing group (earliest participant). |
| V29 | `V29__group_moderation_controls.sql` | Per-participant `muted_until`, `banned_at`, `banned_by`, `ban_reason`. |

---

## Roadmap

```
✅  X3DH key exchange
✅  Symmetric Ratchet + AES-GCM per-message encryption
✅  Multi-device envelope fanout
✅  Phone + email auth
✅  Group chats
✅  Read receipts · typing · presence
✅  Prometheus + Grafana
✅  Docker Compose · GitHub Actions CI

🔜  Full Double Ratchet (DH ratchet + break-in recovery)
🔜  Android client + Android Keystore
🔜  Push notifications
📅  Encrypted voice messages
📅  Encrypted media storage
📅  WebRTC calls + TURN/STUN
📅  Self-destructing messages
💡  Desktop client (Tauri)
🔜  Message reactions (entity + DB ready, API pending)
```

---

## Why this exists

Building a messenger with real E2EE means touching every layer of modern secure communications: key derivation, protocol-level cryptography, multi-device state management, realtime infrastructure, and observability — in one cohesive codebase.

Good starting point for:
- Strong Java / Fullstack portfolio — the E2EE angle makes it memorable
- Learning realtime architecture on Spring Boot
- Android client with proper Keystore integration
- Implementing full Double Ratchet step by step

---

---

## License

This project is licensed under the Apache License 2.0.

Copyright 2026 Evgeniy Vasilenkov

See the [LICENSE](LICENSE) file for details.

---

<div align="center">
<br/>

**If this was useful — drop a ⭐**

*Built with Java, React, and a healthy distrust of servers that promise to protect your data.*

</div>
