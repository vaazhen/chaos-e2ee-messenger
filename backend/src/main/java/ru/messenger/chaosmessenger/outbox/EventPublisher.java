package ru.messenger.chaosmessenger.outbox;

/**
 * Domain services publish through this contract only.
 * {@link OutboxPublisher} sends to Kafka; {@link ru.messenger.chaosmessenger.realtime.RealtimeEventConsumer}
 * is the only consumer that turns events into durable device delivery.
 */
public interface EventPublisher {

    void publish(String aggregateType, String aggregateId, String eventType, Object payload);

    void publish(
            String aggregateType,
            String aggregateId,
            String eventType,
            Object payload,
            String correlationId,
            String idempotencyKey
    );
}
