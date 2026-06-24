## Goal
- Production-refactor an E2EE messenger backend to fix security bugs, clean module boundaries, and prepare for horizontal WebSocket scaling via Kafka + transactional outbox.

## Constraints & Preferences
- No breaking existing API contracts unless absolutely necessary.
- No weakening E2EE guarantees; never move plaintext to server.
- No repositories in controllers; no business logic in controllers.
- Kafka must use transactional outbox pattern, not replace DB transactions.
- Controllers must not depend on repositories; services may.
- Demo endpoints must be disabled by default via `@ConditionalOnProperty`.
- Do not rewrite the whole app; keep modular monolith.
- Kafka-disabled mode must still work locally.

## Progress
### Done
- **Code security audit (30 issues)**: Critical gaps found (attachment auth, call signaling auth), medium (silent JWT catch, god classes), low (missing `@Valid`, N+1 risks, `String.valueOf(null)`).
- **Security bugs fixed**: Attachment download requires `Authentication` + `AttachmentAccessService.canDownload()` (uploader or share any chat). Call signaling checks `CallAuthorizationService.isCallAllowed()`. JWT filter silent `catch` replaced with `log.warn`. `GlobalExceptionHandler` logs all handlers.
- **Phase 1 refactor**: `DemoController` → `DemoService` + `@ConditionalOnProperty`. `AttachmentController` → `AttachmentAccessService`. `TypingController` → `TypingService`. `CallSignalingController` → `CallAuthorizationService`.
- **Phase 2 — god classes split**: `ChatService` (1112→55 lines) into 6 services. `MessageService` (985→25 lines) into 8 services. ArchUnit tests added.
- **Phase 3 — Kafka + transactional outbox**: `OutboxEvent` entity + repository + service. `OutboxPublisher` (scheduled poller, batch 100). `WebSocketEventConsumer` (`@RetryableTopic` with DLQ). `KafkaConfig` (6-partition topic, producer/consumer). Flyway V36 migration. `spring-kafka` + `spring-kafka-test` in pom.xml.
- **SimpMessagingTemplate eliminated from domain services**: `MessageFanoutService`, `ChatAccessService`, `MessageSendService`, `UserService` — all use `if (!kafkaEnabled) direct else outbox` pattern. `ChatAccessService` dedup via `ConcurrentHashSet`.
- `**String.valueOf(null)` fixed**: 4 files (DirectChatService, ChatQueryService, MessageSendService, MessageFanoutService).
- **SelfDestructScheduler refactored**: Uses `MessageFanoutService` instead of own fanout. Batch `saveAll` + dedup by chatId in afterCommit.
- **N+1 query fixes**: `notifyOfflineUsersViaPush` (batch `isOnlineMany` + `findByUsernameIn`). `incrementUnreadForOthers` (stream filter). `ChatQueryService` (removed dead-code fallback loops). `persistEnvelopes` (`saveAll`). `replaceOneTimePreKeys` (`saveAll`).
- **Test compilation fixed**: `BundleControllerTest` + `DeviceControllerTest` — 11 DTO constructors updated to match current records.
- **Checkstyle violations fixed**: `import java.util.*` replaced with explicit imports in 6 files.
- **Architecture docs created**: `ARCHITECTURE.md`, `SECURITY_MODEL.md`, `CONTRIBUTING.md`, `DEAD_LETTER_TOPICS.md`, `ADR-001` (outbox), `ADR-002` (service split).
- **8 commits pushed to `master`**: includes all Phases 1–3 work, N+1 fixes, test fixes, docs.
- **Phase 0 — Baseline restored**: `ChatService` facade fixed (missing `getMyChats`/`getMyDirectRequests` delegation). `ChatServiceTest` rewritten as facade test + 3 new sub-service tests (`DirectChatServiceTest`, `GroupModerationServiceTest`, `ChatQueryServiceTest`). `MessageServiceTest` rewritten as facade test. `MessageControllerTest` fixed (`TypingService` mock). `MessageServiceAdvancedTest` (835 lines, 17 tests) adapted to construct real sub-services with mocked deps. All 8 Phase 0 test files updated.

### In Progress
- (none — Phase 0 complete)

### Blocked
- (none)

## Key Decisions
- **Transaction boundary**: Outbox event written in same DB transaction as domain change. OutboxPublisher polls after commit. Kafka send outside the original DB transaction.
- **Kafka mode**: `chaos.kafka.enabled=false` (default) — direct `SimpMessagingTemplate`. `=true` — outbox → Kafka → consumer per instance.
- **Consumer group for realtime**: Each backend instance uses a unique consumer group so every instance receives all events and delivers only to locally-connected WebSocket sessions.
- **Attachment schema needs migration**: `encrypted_attachments` lacks `chat_id` and `message_id` columns — authorization cannot be scoped to exact chat. Requires Flyway V37.

## Next Steps
- 1a. Add Flyway V37: `chat_id`, `message_id` to `encrypted_attachments`. Fix `AttachmentAccessService` to check exact chat participation.
- 1b. Move WebSocket auth business logic from `WebSocketAuthChannelInterceptor` to `WebSocketAuthService`. Restrict presence subscriptions.
- 2a. Move `ChatQueryService` from `chat/access/` to `chat/application/query/`. 
- 2b. Split `ChatAccessService` — extract `ChatNotificationService`, `ChatDisplayService`. Keep only access checks.
- 2c. Split `MessageFanoutService` — extract `MessageWebSocketPublisher`, `MessageOutboxWriter`, `MessagePushNotificationService`, `MessageUnreadUpdater`, `MessageDtoMapper`.
- 2d. Extract `MessageEnvelopeService` – `MessageEditService` should NOT depend on `MessageSendService`.
- 3. Upgrade outbox: add `status`, `attempts`, `locked_by`, `last_error`, `next_attempt_at`, `idempotency_key`. Use `SELECT ... FOR UPDATE SKIP LOCKED`. Exponential backoff. DEAD state after max attempts.
- 4. Add Kafka to `docker-compose.yml`. Proper topic creation (`chaos.message.events`, `chaos.chat.events`, etc.). Structured logging with `correlationId`.
- 5. Complete realtime horizontal scaling: `WebSocketSessionRegistry`, `RealtimeEventConsumer`, idempotency cache.
- 6. Observability: Prometheus metrics for outbox, Kafka, WebSocket.
- 7. Add tests: architecture, attachment, outbox, Kafka (Testcontainers), WebSocket auth.

## Critical Context
- **Attachment authorization is CRITICAL**: Current check is "shares any chat with uploader" — gives access to users in unrelated chats. Schema lacks `chat_id`/`message_id` on `encrypted_attachments`. Fix requires migration V37.
- **`ChatQueryService` in wrong package**: Lives in `chat/access/` but contains DTO mapping, query logic, presence joins — not pure access checks.
- **`ChatAccessService` mixes concerns**: Contains access checks, `SimpMessagingTemplate` notify, outbox dedup, `ChatListUpdateEvent` construction, `savedChatName` display helper.
- **`MessageFanoutService` is a god class**: ~300 lines with WebSocket fanout, outbox write, push notification, unread counters, metrics, DTO mapping, reaction summaries.
- **`WebSocketAuthChannelInterceptor` contains direct repository logic**: Queries `ChatParticipantRepository` directly instead of delegating to `ChatAccessService`.
- **VPS**: `168.222.141.25` (Hetzner). HTTPS via `sslip.io`. Demo accounts `alice_demo` (`+19999999998`/`111111`), `bob_demo` (`+19999999999`/`000000`).

## Relevant Files
- `backend/src/main/java/ru/messenger/chaosmessenger/attachment/domain/EncryptedAttachment.java` — lacks `chatId`, `messageId` columns; needs migration V37.
- `backend/src/main/java/ru/messenger/chaosmessenger/attachment/access/AttachmentAccessService.java` — `canDownload` checks `shareAnyChat` (too broad).
- `backend/src/main/java/ru/messenger/chaosmessenger/chat/access/ChatAccessService.java` — mixes access, notify, outbox, display helpers.
- `backend/src/main/java/ru/messenger/chaosmessenger/chat/access/ChatQueryService.java` — belongs in `chat/application/query/`, not `access/`.
- `backend/src/main/java/ru/messenger/chaosmessenger/message/service/MessageFanoutService.java` — god class (~300 lines), needs splitting.
- `backend/src/main/java/ru/messenger/chaosmessenger/message/service/MessageEditService.java` — depends on `MessageSendService` for envelope logic; should depend on `MessageEnvelopeService`.
- `backend/src/main/java/ru/messenger/chaosmessenger/outbox/OutboxEvent.java` — minimal fields; must add status, attempts, locking, idempotency.
- `backend/src/main/java/ru/messenger/chaosmessenger/outbox/OutboxPublisher.java` — uses `findAllUnpublished()` with no locking; must use `SELECT FOR UPDATE SKIP LOCKED`.
- `backend/src/main/java/ru/messenger/chaosmessenger/infra/ws/WebSocketAuthChannelInterceptor.java` — direct `ChatParticipantRepository` query; no service delegation.
- `backend/src/main/java/ru/messenger/chaosmessenger/outbox/WebSocketEventConsumer.java` — DLT handler logs full `event.payload()`; should log only eventId/eventType/aggregateType.
- `backend/src/test/java/ru/messenger/chaosmessenger/chat/ChatServiceTest.java` — rewritten as facade test.
- `backend/src/test/java/ru/messenger/chaosmessenger/chat/DirectChatServiceTest.java` — new, covers createDirectChat.
- `backend/src/test/java/ru/messenger/chaosmessenger/chat/GroupModerationServiceTest.java` — new, covers group ops + RBAC.
- `backend/src/test/java/ru/messenger/chaosmessenger/chat/ChatQueryServiceTest.java` — new, covers getMyChats.
- `backend/src/test/java/ru/messenger/chaosmessenger/message/MessageServiceTest.java` — rewritten as facade test.
- `backend/src/test/java/ru/messenger/chaosmessenger/message/MessageServiceAdvancedTest.java` — adapted to sub-service architecture.
- `backend/src/test/java/ru/messenger/chaosmessenger/message/api/MessageControllerTest.java` — fixed TypingService mock.
- `backend/src/main/resources/db/migration/V36__outbox_events.sql` — current minimal outbox schema; needs upgrade.
