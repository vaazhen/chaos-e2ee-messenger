package ru.messenger.chaosmessenger.outbox;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EventTopicResolverTest {

    private final EventTopicResolver resolver = new EventTopicResolver();

    @Test
    void routesMessageAndReceiptEventsToDifferentTopics() {
        assertThat(resolver.topicFor(event("message", "MESSAGE_CREATED")))
                .isEqualTo("chaos.message.events");
        assertThat(resolver.topicFor(event("message", "MESSAGE_STATUS")))
                .isEqualTo("chaos.receipt.events");
        assertThat(resolver.topicFor(event("message", "MESSAGE_BULK_STATUS")))
                .isEqualTo("chaos.receipt.events");
    }

    @Test
    void routesChatAndRequestToTheSameChatTopic() {
        assertThat(resolver.topicFor(event("chat", "CHAT_CREATED")))
                .isEqualTo("chaos.chat.events");
        assertThat(resolver.topicFor(event("request", "REQUEST_CREATED")))
                .isEqualTo("chaos.chat.events");
    }

    @Test
    void routesUserAndSecuritySeparately() {
        assertThat(resolver.topicFor(event("user", "PROFILE_UPDATED")))
                .isEqualTo("chaos.user.events");
        assertThat(resolver.topicFor(event("device", "DEVICE_REVOKED")))
                .isEqualTo("chaos.security.events");
    }

    private static OutboxEvent event(String aggregate, String type) {
        return OutboxEvent.builder()
                .aggregateType(aggregate)
                .eventType(type)
                .build();
    }
}
