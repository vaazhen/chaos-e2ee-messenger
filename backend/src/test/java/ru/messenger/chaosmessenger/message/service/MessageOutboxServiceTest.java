package ru.messenger.chaosmessenger.message.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import ru.messenger.chaosmessenger.TestFixtures;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.message.domain.MessageEnvelope;
import ru.messenger.chaosmessenger.message.dto.ReactionEvent;
import ru.messenger.chaosmessenger.outbox.OutboxService;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MessageOutboxServiceTest {

    private ChatParticipantRepository participants;
    private UserDeviceRepository devices;
    private OutboxService outboxService;
    private MessageOutboxService service;

    @BeforeEach
    void setUp() {
        participants = mock(ChatParticipantRepository.class);
        devices = mock(UserDeviceRepository.class);
        outboxService = mock(OutboxService.class);
        service = new MessageOutboxService(participants, devices, outboxService);
        when(participants.findUserIdsByChatId(10L)).thenReturn(List.of(1L, 2L));
        when(participants.findDistinctUsernamesByChatId(10L)).thenReturn(List.of("alice", "bob"));
        when(devices.findActiveByUserIdsWithUser(List.of(1L, 2L))).thenReturn(List.of());
    }

    @Test
    void messageCreatedWritesPerDeviceEnvelopesUnderStableKey() {
        Message message = TestFixtures.sentMessage(500L, 10L, 1L, "alice-phone");
        MessageEnvelope bobEnvelope = new MessageEnvelope();
        bobEnvelope.setTargetDeviceId("bob-phone");
        bobEnvelope.setCiphertext("cipher-bob");
        bobEnvelope.setNonce("nonce-bob");

        service.messageCreated(message, Map.of("bob-phone", bobEnvelope));

        ArgumentCaptor<Map<String, Object>> payload = ArgumentCaptor.forClass(Map.class);
        verify(outboxService).write(
                eq("message"),
                eq("10"),
                eq("MESSAGE_CREATED"),
                payload.capture(),
                isNull(),
                eq("msg:500:MESSAGE_CREATED:1")
        );
        assertThat(payload.getValue().get("messageId")).isEqualTo(500L);
        assertThat(payload.getValue().get("senderId")).isEqualTo(1L);
        assertThat(payload.getValue().get("content")).isNull();
        @SuppressWarnings("unchecked")
        Map<String, Object> envelopes = (Map<String, Object>) payload.getValue().get("envelopes");
        assertThat(envelopes).containsKey("bob-phone");
        @SuppressWarnings("unchecked")
        Map<String, Object> bob = (Map<String, Object>) envelopes.get("bob-phone");
        assertThat(bob.get("ciphertext")).isEqualTo("cipher-bob");
    }

    @Test
    void messageStatusTargetsSenderDevicesOnly() {
        Message message = TestFixtures.sentMessage(500L, 10L, 1L, "alice-phone");
        when(devices.findByUserIdAndActiveTrue(1L)).thenReturn(List.of(
                TestFixtures.device(1L, 1L, "alice-phone")
        ));

        service.messageStatus(message, "READ");

        ArgumentCaptor<Map<String, Object>> payload = ArgumentCaptor.forClass(Map.class);
        verify(outboxService).write(
                eq("message"),
                eq("10"),
                eq("MESSAGE_STATUS"),
                payload.capture(),
                isNull(),
                eq("msg:500:STATUS:READ")
        );
        assertThat(payload.getValue().get("targetDeviceIds")).isEqualTo(List.of("alice-phone"));
        assertThat(payload.getValue()).doesNotContainKey("envelopes");
    }

    @Test
    void reactionKeyIncludesActorEmojiAndToggle() {
        service.messageReaction(10L, new ReactionEvent(
                "MESSAGE_REACTION", 500L, 10L, 2L, "bob-phone", "👍", true, Map.of("👍", 1L), 1L
        ));

        verify(outboxService).write(
                eq("message"),
                eq("10"),
                eq("MESSAGE_REACTION"),
                org.mockito.ArgumentMatchers.any(),
                isNull(),
                eq("msg:500:REACT:2:👍:true")
        );
    }
}
