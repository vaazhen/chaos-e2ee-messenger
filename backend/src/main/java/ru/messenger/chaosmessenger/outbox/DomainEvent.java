package ru.messenger.chaosmessenger.outbox;

import java.time.Instant;

public record DomainEvent(
    String aggregateType,
    String aggregateId,
    String eventType,
    String payload,
    Instant occurredAt
) {

    public static DomainEvent from(OutboxEvent entity) {
        return new DomainEvent(
            entity.getAggregateType(),
            entity.getAggregateId(),
            entity.getEventType(),
            entity.getPayload(),
            entity.getOccurredAt()
        );
    }
}
