# Dead-Letter Topics & Retry Strategy

## Overview

When Kafka event processing fails, the event is retried and eventually moved to a dead-letter topic (DLT) for manual inspection.

## Topic Structure

| Topic | Partitions | Retention | Purpose |
|---|---|---|---|
| `chaos.domain.events` | 6 | 7 days | Primary domain events |
| `chaos.domain.events.retry` | 6 | 1 day | Retry attempts (Spring RetryTopic) |
| `chaos.domain.events.dlt` | 6 | 30 days | Failed events after all retries |

## Retry Policy

- **maxAttempts**: 3 (1 initial + 2 retries)
- **backoff**: Fixed 1 second between retries
- **Recoverable exceptions**: `JsonProcessingException`, `DataAccessException` (transient DB errors)
- **Non-recoverable**: `IllegalArgumentException`, `NullPointerException` — sent directly to DLT

## DLT Consumer

The `WebSocketEventConsumer.DltHandler` logs failed events for manual investigation. In production, this should be connected to an alerting system (PagerDuty, Opsgenie).

## Implementation

Defined via Spring Kafka's `@RetryableTopic`:

```java
@RetryableTopic(
    attempts = "3",
    backoff = @Backoff(delay = 1000),
    kafkaTemplate = "kafkaTemplate",
    dltTopicSuffix = ".dlt"
)
@KafkaListener(topics = "chaos.domain.events")
public void handleDomainEvent(DomainEvent event) { ... }

@DltHandler
public void handleDlt(DomainEvent event) { ... }
```
