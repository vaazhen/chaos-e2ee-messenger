# Architecture

## Overview

Chaos Messenger is an end-to-end encrypted (E2EE) instant messaging backend built with Spring Boot 3.5. It follows a layered architecture with clean separation between API, application service, and data layers.

## Module Layout

```
ru.messenger.chaosmessenger
├── attachment/       # Encrypted file attachments
│   ├── access/       # Access control for downloads
│   ├── api/          # REST endpoints
│   ├── domain/       # JPA entities
│   ├── repository/   # Data access
│   └── service/      # Business logic
├── auth/             # Authentication (phone verification, JWT)
├── backup/           # Encrypted user backups
├── call/             # WebRTC call signaling
├── chat/             # Core chat domain
│   ├── access/       # Access/validation helpers
│   ├── api/          # REST endpoints
│   ├── domain/       # Chat, Message, ChatParticipant entities
│   ├── dto/          # Request/response DTOs
│   ├── repository/   # Data access
│   └── service/      # Business logic (split from god classes)
├── common/           # Shared utilities, exceptions, TransactionUtils
├── crypto/           # E2EE key management, device/bundle CRUD
│   ├── api/          # REST endpoints
│   ├── device/       # UserDevice domain + repository
│   └── service/      # Business logic
├── demo/             # Demo endpoints (disabled by default)
├── infra/            # Infrastructure
│   ├── ws/           # WebSocket config, auth interceptor
│   └── presence/     # Online tracking (Redis), unread counters
├── message/          # Message sending, editing, deleting
│   ├── access/       # Message access/validation helpers
│   ├── api/          # REST endpoints
│   ├── domain/       # MessageEnvelope, MessageEvent, etc.
│   ├── dto/          # Request/response DTOs
│   ├── repository/   # Data access
│   └── service/      # Business logic (split from god class)
├── outbox/           # Transactional outbox for horizontal scaling
├── push/             # Web Push (VAPID) notifications
├── user/             # User profiles
└── ChaosMessengerApplication.java
```

## Layer Architecture

```
[Controller] → [Service (facade)] → [Sub-Service] → [Repository] → [DB]
      ↓                                                              ↓
  [DTO]                                                       [Domain Entity]
```

### Rules enforced by ArchUnit tests:
- Controllers must NOT depend on Repositories
- Services must NOT depend on Controllers
- Controllers should only inject Services (facades), not Sub-Services

## Key Patterns

### Facade over Sub-Services
`ChatService` and `MessageService` are thin facades that delegate to specialized sub-services:

- **ChatService** delegates to: `ChatAccessService`, `ChatQueryService`, `DirectChatService`, `SavedMessagesService`, `GroupModerationService`
- **MessageService** delegates to: `MessageAccessService`, `MessageSendService`, `MessageEditService`, `MessageDeleteService`, `MessageReceiptService`, `MessageReactionService`, `MessageTimelineService`, `MessageFanoutService`

### Transactional Outbox (Phase 3)
For horizontal WebSocket scaling, domain events flow through a transactional outbox:

```
[Service] → [DB: domain change + outbox_events row] → [Post-commit]
                                                               ↓
                                              [OutboxPublisher] (scheduled poller)
                                                               ↓
                                                           [Kafka]
                                                               ↓
                                              [WebSocketEventConsumer] (per instance)
                                                               ↓
                                              [SimpMessagingTemplate] → WebSocket
```

When Kafka is disabled (`chaos.kafka.enabled=false`, default), events fan out directly via `SimpMessagingTemplate`.

### WebSocket Architecture
- STOMP over WebSocket with SockJS fallback
- Simple (in-memory) broker on `/topic` and `/queue`
- Auth interceptor validates JWT + device ID on CONNECT and SUBSCRIBE
- User-scoped topics: `/topic/users/{username}/chats`, `/topic/users/{username}/requests`
- Device-scoped topics: `/topic/devices/{deviceId}/chats/{chatId}`
- No external message broker needed until horizontal scaling (solved by Kafka + outbox)

### E2EE Message Flow
1. Client encrypts message per-participant-device using Double Ratchet
2. Client sends one envelope per device + one self-envelope
3. Server stores envelopes; does NOT have access to plaintext
4. Each device receives only its own envelope via WebSocket
5. Client decrypts locally using its ratchet state

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Framework | Spring Boot 3.5.13 |
| Database | PostgreSQL (Flyway migrations) |
| Cache | Redis (presence, unread counters) |
| Messaging | STOMP over WebSocket |
| Pub/Sub (scale) | Kafka + Transactional Outbox |
| Auth | JWT (OAuth2 Resource Server) |
| Push | Web Push (VAPID) |
| Docs | OpenAPI / Swagger UI |
| Metrics | Micrometer + Prometheus |
| Testing | JUnit 5, Testcontainers, ArchUnit |
