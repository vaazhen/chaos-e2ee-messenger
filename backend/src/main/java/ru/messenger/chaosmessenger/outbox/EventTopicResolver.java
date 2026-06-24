package ru.messenger.chaosmessenger.outbox;

import org.springframework.stereotype.Component;

@Component
public class EventTopicResolver {

    public String topicFor(OutboxEvent event) {
        return topicFor(event.getAggregateType(), event.getEventType());
    }

    public String topicFor(DomainEvent event) {
        return topicFor(event.aggregateType(), event.eventType());
    }

    private String topicFor(String aggregateType, String eventType) {
        String aggregate = aggregateType == null ? "" : aggregateType.toLowerCase();
        String type = eventType == null ? "" : eventType.toUpperCase();

        if ("message".equals(aggregate)) {
            if (type.contains("STATUS") || type.contains("RECEIPT") || type.contains("READ") || type.contains("DELIVER")) {
                return KafkaConfig.RECEIPT_EVENTS_TOPIC;
            }
            return KafkaConfig.MESSAGE_EVENTS_TOPIC;
        }
        if ("chat".equals(aggregate) || "request".equals(aggregate)) {
            return KafkaConfig.CHAT_EVENTS_TOPIC;
        }
        if ("user".equals(aggregate)) {
            return KafkaConfig.USER_EVENTS_TOPIC;
        }
        if ("push".equals(aggregate)) {
            return KafkaConfig.PUSH_EVENTS_TOPIC;
        }
        if ("security".equals(aggregate) || "device".equals(aggregate)) {
            return KafkaConfig.SECURITY_EVENTS_TOPIC;
        }
        if ("audit".equals(aggregate)) {
            return KafkaConfig.AUDIT_EVENTS_TOPIC;
        }
        return KafkaConfig.AUDIT_EVENTS_TOPIC;
    }
}
