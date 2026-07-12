package ru.messenger.chaosmessenger.realtime;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.outbox.DomainEvent;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RealtimeEventConsumerTest {

    private StompEventPublisher publisher;
    private RealtimeEventStore eventStore;
    private RealtimeEventConsumer consumer;

    @BeforeEach
    void setUp() {
        publisher = mock(StompEventPublisher.class);
        eventStore = mock(RealtimeEventStore.class);
        when(eventStore.append(anyString(), anyString(), anyString(), any())).thenAnswer(inv -> inv.getArgument(3));
        consumer = new RealtimeEventConsumer(publisher, eventStore, mock(UserDeviceRepository.class), new ObjectMapper(), new SimpleMeterRegistry());
    }

    @Test
    void includesEventIdAndDeduplicatesOnlyAfterSuccessfulFanout() {
        DomainEvent event = messageEvent(
                "evt-1",
                "{\"chatId\":10,\"deviceIds\":[\"device-a\"],"
                        + "\"envelopes\":{\"device-a\":{\"ciphertext\":\"cipher\"}}}"
        );

        consumer.handleDomainEvent(event);
        consumer.handleDomainEvent(event);

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(publisher, times(1)).publishToDevice(eq("device-a"), eq("/chats/10"), payload.capture());
        JsonNode delivered = (JsonNode) payload.getValue();
        assertThat(delivered.get("eventId").asText()).isEqualTo("evt-1");
    }

    @Test
    void failedAttemptDoesNotPoisonDedupCacheForKafkaRetry() {
        assertThatThrownBy(() -> consumer.handleDomainEvent(messageEvent("evt-retry", "not-json")))
                .isInstanceOf(IllegalStateException.class);

        consumer.handleDomainEvent(messageEvent(
                "evt-retry",
                "{\"chatId\":10,\"deviceIds\":[\"device-a\"],"
                        + "\"envelopes\":{\"device-a\":{\"ciphertext\":\"cipher\"}}}"
        ));

        verify(publisher, times(1)).publishToDevice(eq("device-a"), eq("/chats/10"), org.mockito.ArgumentMatchers.any());
    }

    private DomainEvent messageEvent(String eventId, String payload) {
        return new DomainEvent(
                eventId,
                "message",
                "10",
                "MESSAGE_CREATED",
                1,
                1,
                payload,
                Instant.parse("2026-07-12T00:00:00Z"),
                "corr-1",
                "idem-1"
        );
    }
}
