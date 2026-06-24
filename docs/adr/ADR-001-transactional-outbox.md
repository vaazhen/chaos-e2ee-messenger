# ADR-001: Transactional Outbox for Horizontal WebSocket Scaling

## Status

Accepted (Phase 3)

## Context

The application uses Spring's `SimpMessagingTemplate` for real-time WebSocket fanout. This works within a single instance but fails when scaling horizontally:
- When multiple backend instances run behind a load balancer, a WebSocket message sent from instance A is not received by users connected to instance B.
- Direct `SimpMessagingTemplate.convertAndSend()` only reaches the local in-memory broker.

## Decision

Implement the Transactional Outbox pattern with Apache Kafka for cross-instance event distribution.

### How it works

1. **Within the same DB transaction**, services write an `OutboxEvent` row to the `outbox_events` table.
2. **After commit**, a scheduled `OutboxPublisher` polls unpublished events and publishes them to the `chaos.domain.events` topic.
3. **Each instance** runs a `WebSocketEventConsumer` (`@KafkaListener`) that receives domain events and fans them out locally via `SimpMessagingTemplate`.

### Key properties

- **At-least-once delivery**: Kafka consumer commits offsets after processing. Duplicates are possible but harmless (WebSocket fanout is idempotent per destination).
- **Ordering per aggregate**: Partition key = `aggregateId` (e.g., chatId). All events for the same aggregate go to the same partition.
- **Backward compatibility**: When `chaos.kafka.enabled=false` (default), the system works exactly as before — direct `SimpMessagingTemplate` fanout only.

### Topics

| Topic | Partitions | Key | Events |
|---|---|---|---|
| `chaos.domain.events` | 6 | aggregateId | message.*, chat.*, user.* |

## Consequences

### Positive
- Horizontal scaling of WebSocket: any instance can serve any user
- Loose coupling between domain services and WebSocket transport
- Outbox table provides an audit trail of published events

### Negative
- Increased infrastructure complexity (Kafka cluster)
- Added latency (~1 second poll interval) when outbox is used
- Dual-write until all services are migrated: direct fanout still happens alongside outbox writes

### Trade-offs considered
- **Redis Pub/Sub**: Simpler but no persistence, no replay, no partitioning.
- **RabbitMQ**: Would also work but Kafka chosen for durability, partitioning, and replayability.
- **No broker (sticky sessions)**: Simplest but defeats horizontal scaling for WebSocket.
