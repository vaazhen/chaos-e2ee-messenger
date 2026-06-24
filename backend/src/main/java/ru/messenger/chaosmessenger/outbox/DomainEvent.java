package ru.messenger.chaosmessenger.outbox;

import java.time.Instant;

public record DomainEvent(
        String eventId,
        String aggregateType,
        String aggregateId,
        String eventType,
        Integer eventVersion,
        Integer schemaVersion,
        String payload,
        Instant occurredAt,
        String correlationId,
        String idempotencyKey
) {

    public static DomainEvent from(OutboxEvent entity) {
        return new DomainEvent(
                entity.getEventId(),
                entity.getAggregateType(),
                entity.getAggregateId(),
                entity.getEventType(),
                entity.getEventVersion(),
                entity.getSchemaVersion(),
                entity.getPayload(),
                entity.getOccurredAt(),
                entity.getCorrelationId(),
                entity.getIdempotencyKey()
        );
    }
}
