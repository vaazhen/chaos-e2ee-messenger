package ru.messenger.chaosmessenger.realtime;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import ru.messenger.chaosmessenger.TestFixtures;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.message.service.MessageFanoutService;
import ru.messenger.chaosmessenger.outbox.DomainEvent;
import ru.messenger.chaosmessenger.user.repository.UserRepository;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DomainEventProcessorTest {

    private StompEventPublisher publisher;
    private RealtimeEventStore eventStore;
    private MessageFanoutService fanout;
    private UserDeviceRepository userDeviceRepository;
    private DomainEventProcessor processor;

    @BeforeEach
    void setUp() {
        publisher = mock(StompEventPublisher.class);
        eventStore = mock(RealtimeEventStore.class);
        fanout = mock(MessageFanoutService.class);
        userDeviceRepository = mock(UserDeviceRepository.class);
        when(eventStore.append(anyString(), anyString(), anyString(), any())).thenAnswer(inv ->
                new RealtimeEventStore.AppendResult(inv.getArgument(3), true));
        processor = new DomainEventProcessor(
                publisher,
                eventStore,
                userDeviceRepository,
                mock(UserRepository.class),
                fanout,
                new ObjectMapper(),
                new SimpleMeterRegistry()
        );
    }

    @Test
    void persistsBeforeNotifyAndStripsOtherDeviceEnvelopes() {
        DomainEvent event = event(
                "evt-1",
                "message",
                "MESSAGE_CREATED",
                "{\"chatId\":10,\"deviceIds\":[\"device-a\",\"device-b\"],"
                        + "\"envelopes\":{\"device-a\":{\"ciphertext\":\"cipher-a\"},"
                        + "\"device-b\":{\"ciphertext\":\"cipher-b\"}}}"
        );

        processor.process(event);

        InOrder order = inOrder(eventStore, publisher);
        order.verify(eventStore).append(eq("device-a"), eq("evt-1"), eq("/chats/10"), any());
        order.verify(eventStore).append(eq("device-b"), eq("evt-1"), eq("/chats/10"), any());
        order.verify(publisher).publishToDevice(eq("device-a"), eq("/chats/10"), any());

        ArgumentCaptor<ObjectNode> deviceA = ArgumentCaptor.forClass(ObjectNode.class);
        verify(publisher).publishToDevice(eq("device-a"), eq("/chats/10"), deviceA.capture());
        assertThat(deviceA.getValue().has("envelopes")).isFalse();
        assertThat(deviceA.getValue().get("envelope").get("ciphertext").asText()).isEqualTo("cipher-a");
        assertThat(deviceA.getValue().toString()).doesNotContain("cipher-b");
    }

    @Test
    void persistFailureDoesNotNotify() {
        when(eventStore.append(anyString(), anyString(), anyString(), any()))
                .thenThrow(new IllegalStateException("db down"));

        assertThatThrownBy(() -> processor.process(event(
                "evt-fail",
                "message",
                "MESSAGE_CREATED",
                "{\"chatId\":10,\"deviceIds\":[\"device-a\"],"
                        + "\"envelopes\":{\"device-a\":{\"ciphertext\":\"cipher\"}}}"
        ))).isInstanceOf(IllegalStateException.class);

        verify(publisher, never()).publishToDevice(anyString(), anyString(), any());
        verify(fanout, never()).incrementUnreadForOthers(any(), any());
    }

    @Test
    void statusEventsGoToStatusDestination() {
        processor.process(event(
                "evt-status",
                "message",
                "MESSAGE_STATUS",
                "{\"chatId\":10,\"targetDeviceIds\":[\"alice-phone\"],\"status\":\"READ\"}"
        ));

        verify(eventStore).append(eq("alice-phone"), eq("evt-status"), eq("/status"), any());
        verify(publisher).publishToDevice(eq("alice-phone"), eq("/status"), any());
        verify(fanout, never()).incrementUnreadForOthers(any(), any());
    }

    @Test
    void chatEventsFanoutToParticipantDevicesOnChatsDestination() {
        when(userDeviceRepository.findActiveByUsernameWithUser("alice"))
                .thenReturn(List.of(TestFixtures.device(1L, 1L, "alice-phone")));
        when(userDeviceRepository.findActiveByUsernameWithUser("bob")).thenReturn(List.of());

        processor.process(event(
                "evt-chat",
                "chat",
                "GROUP_PARTICIPANTS_INVITED",
                "{\"chatId\":20,\"participantUsernames\":[\"alice\",\"bob\"]}"
        ));

        ArgumentCaptor<ObjectNode> payload = ArgumentCaptor.forClass(ObjectNode.class);
        verify(publisher).publishToDevice(eq("alice-phone"), eq("/chats"), payload.capture());
        assertThat(payload.getValue().get("reason").asText()).isEqualTo("group_participants_invited");
        assertThat(payload.getValue().get("chatId").asLong()).isEqualTo(20L);
        verify(publisher, never()).publishToDevice(eq("bob-phone"), anyString(), any());
    }

    @Test
    void requestEventsUseRequestsDestination() {
        when(userDeviceRepository.findActiveByUsernameWithUser("alice"))
                .thenReturn(List.of(TestFixtures.device(1L, 1L, "alice-phone")));

        processor.process(event(
                "evt-req",
                "request",
                "REQUEST_CREATED",
                "{\"chatId\":20,\"participantUsernames\":[\"alice\"]}"
        ));

        verify(publisher).publishToDevice(eq("alice-phone"), eq("/requests"), any());
    }

    @Test
    void unreadAndPushRunOnlyOnFirstDurableInsert() {
        DomainEvent event = event(
                "evt-unread",
                "message",
                "MESSAGE_CREATED",
                "{\"chatId\":10,\"senderId\":1,\"messageId\":500,\"deviceIds\":[\"device-a\"],"
                        + "\"envelopes\":{\"device-a\":{\"ciphertext\":\"cipher\"}}}"
        );
        when(eventStore.append(anyString(), anyString(), anyString(), any()))
                .thenReturn(new RealtimeEventStore.AppendResult(new ObjectMapper().createObjectNode(), true))
                .thenReturn(new RealtimeEventStore.AppendResult(new ObjectMapper().createObjectNode(), false));

        processor.process(event);
        processor.process(event);

        verify(fanout, times(1)).incrementUnreadForOthers(10L, 1L);
        verify(publisher, times(2)).publishToDevice(eq("device-a"), eq("/chats/10"), any());
    }

    @Test
    void invalidPayloadFailsWithoutNotify() {
        assertThatThrownBy(() -> processor.process(event("evt-retry", "message", "MESSAGE_CREATED", "not-json")))
                .isInstanceOf(IllegalStateException.class);
        verify(publisher, never()).publishToDevice(anyString(), anyString(), any());
        verify(eventStore, never()).append(anyString(), anyString(), anyString(), any());
    }

    @Test
    void persistsThenNotifiesForAtLeastOnceRedelivery() {
        DomainEvent event = event(
                "evt-1",
                "message",
                "MESSAGE_CREATED",
                "{\"chatId\":10,\"deviceIds\":[\"device-a\"],"
                        + "\"envelopes\":{\"device-a\":{\"ciphertext\":\"cipher\"}}}"
        );

        processor.process(event);
        processor.process(event);

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(publisher, times(2)).publishToDevice(eq("device-a"), eq("/chats/10"), payload.capture());
        JsonNode delivered = (JsonNode) payload.getAllValues().get(0);
        assertThat(delivered.get("eventId").asText()).isEqualTo("evt-1");
    }

    private DomainEvent event(String eventId, String aggregate, String type, String payload) {
        return new DomainEvent(
                eventId,
                aggregate,
                "10",
                type,
                1,
                1,
                payload,
                Instant.parse("2026-07-12T00:00:00Z"),
                "corr-1",
                "idem-1"
        );
    }
}
