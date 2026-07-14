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

    public DomainEvent {
        if (eventId == null || eventId.isBlank()) {
            throw new IllegalArgumentException("eventId is required");
        }
        if (aggregateType == null || aggregateType.isBlank()) {
            throw new IllegalArgumentException("aggregateType is required");
        }
        if (aggregateId == null || aggregateId.isBlank()) {
            throw new IllegalArgumentException("aggregateId is required");
        }
        if (eventType == null || eventType.isBlank()) {
            throw new IllegalArgumentException("eventType is required");
        }
        if (payload == null) {
            throw new IllegalArgumentException("payload is required");
        }
        if (occurredAt == null) {
            throw new IllegalArgumentException("occurredAt is required");
        }
    }

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
