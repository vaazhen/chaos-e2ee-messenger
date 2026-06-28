package ru.messenger.chaosmessenger.outbox;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Interface for publishing domain events.
 * When Kafka is disabled: events are fanned out directly via SimpMessagingTemplate.
 * When Kafka is enabled: events are written to the outbox table and published to Kafka.
 */
public interface EventPublisher {

    void publish(String aggregateType, String aggregateId, String eventType, Object payload);

    void publishAndFanout(String aggregateType, String aggregateId, String eventType,
                          Object payload, LocalFanoutAction fanoutAction);

    @FunctionalInterface
    interface LocalFanoutAction {
        void fanout(JsonNode payload);
    }
}
