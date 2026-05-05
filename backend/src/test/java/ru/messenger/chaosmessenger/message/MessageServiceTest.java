package ru.messenger.chaosmessenger.message;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import ru.messenger.chaosmessenger.TestFixtures;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.common.exception.MessageException;
import ru.messenger.chaosmessenger.crypto.device.CurrentDeviceService;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedMessageEnvelopeInput;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedSendMessageRequestV2;
import ru.messenger.chaosmessenger.infra.presence.UnreadService;
import ru.messenger.chaosmessenger.message.dto.DeviceMessageEventResponse;
import ru.messenger.chaosmessenger.message.dto.ReactionEvent;
import ru.messenger.chaosmessenger.message.repository.MessageEnvelopeRepository;
import ru.messenger.chaosmessenger.message.repository.MessageEventRepository;
import ru.messenger.chaosmessenger.message.repository.MessageReactionRepository;
import ru.messenger.chaosmessenger.message.repository.MessageReceiptRepository;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;
import ru.messenger.chaosmessenger.message.service.MessageService;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.repository.UserRepository;
import ru.messenger.chaosmessenger.user.service.UserIdentityService;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("MessageService")
class MessageServiceTest {

    @Mock MessageRepository messageRepository;
    @Mock MessageEnvelopeRepository messageEnvelopeRepository;
    @Mock MessageEventRepository messageEventRepository;
    @Mock MessageReceiptRepository messageReceiptRepository;
    @Mock MessageReactionRepository messageReactionRepository;
    @Mock ChatParticipantRepository participantRepository;
    @Mock UserRepository userRepository;
    @Mock UserIdentityService userIdentityService;
    @Mock UserDeviceRepository userDeviceRepository;
    @Mock CurrentDeviceService currentDeviceService;
    @Mock UnreadService unreadService;
    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock ObjectMapper objectMapper;
    @Spy MeterRegistry meterRegistry = new SimpleMeterRegistry();

    @InjectMocks MessageService messageService;

    User alice;
    UserDevice aliceDevice;

    @BeforeEach
    void setUp() {
        alice = TestFixtures.user(1L, "alice");
        aliceDevice = TestFixtures.device(10L, 1L, "device-alice-1");
    }

    @Test
    void returnsExistingMessageForSameClientMessageIdRetry() {
        Message existing = TestFixtures.sentMessage(100L, 5L, 1L, "device-alice-1");
        existing.setClientMessageId("client-100");

        when(userIdentityService.require("alice")).thenReturn(alice);
        when(currentDeviceService.requireCurrentDevice()).thenReturn(aliceDevice);
        when(participantRepository.existsByChatIdAndUserId(5L, 1L)).thenReturn(true);
        when(messageRepository.findBySenderIdAndSenderDeviceIdAndClientMessageId(1L, "device-alice-1", "client-100"))
                .thenReturn(Optional.of(existing));
        when(messageEnvelopeRepository.findByMessageIdAndTargetDeviceId(100L, "device-alice-1"))
                .thenReturn(Optional.empty());

        DeviceMessageEventResponse response = messageService.sendEncryptedMessageV2(
                "alice",
                sendRequest(5L, "client-100", "device-alice-1")
        );

        assertThat(response.messageId()).isEqualTo(100L);
        assertThat(response.clientMessageId()).isEqualTo("client-100");
        verify(messageRepository, never()).save(any());
        verify(messageEnvelopeRepository, never()).save(any());
        verify(unreadService, never()).increment(anyLong(), anyLong());
    }

    @Test
    void rejectsClientMessageIdConflictInsideSameSenderDeviceScope() {
        Message existing = TestFixtures.sentMessage(100L, 6L, 1L, "device-alice-1");
        existing.setClientMessageId("client-100");

        when(userIdentityService.require("alice")).thenReturn(alice);
        when(currentDeviceService.requireCurrentDevice()).thenReturn(aliceDevice);
        when(participantRepository.existsByChatIdAndUserId(5L, 1L)).thenReturn(true);
        when(messageRepository.findBySenderIdAndSenderDeviceIdAndClientMessageId(1L, "device-alice-1", "client-100"))
                .thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> messageService.sendEncryptedMessageV2(
                "alice",
                sendRequest(5L, "client-100", "device-alice-1")
        ))
                .isInstanceOf(MessageException.class)
                .hasMessageContaining("clientMessageId");
    }

    @Test
    void markChatAsDeliveredWritesReceipt() {
        when(userIdentityService.require("alice")).thenReturn(alice);
        when(currentDeviceService.requireCurrentDevice()).thenReturn(aliceDevice);
        when(participantRepository.existsByChatIdAndUserId(5L, 1L)).thenReturn(true);
        when(messageRepository.findDistinctSenderIdsByChatIdAndSenderIdNotAndStatus(5L, 1L, Message.MessageStatus.SENT))
                .thenReturn(List.of(2L));
        when(messageReceiptRepository.upsertDeliveredForChat(eq(5L), eq(1L), eq("device-alice-1"), any(java.time.LocalDateTime.class)))
                .thenReturn(1);
        when(participantRepository.findDistinctUsernamesByChatId(5L)).thenReturn(List.of("alice", "bob"));
        when(userDeviceRepository.findByUserIdInAndActiveTrue(List.of(2L))).thenReturn(List.of());

        messageService.markChatAsDelivered("alice", 5L);

        verify(messageReceiptRepository).upsertDeliveredForChat(
                eq(5L), eq(1L), eq("device-alice-1"), any(java.time.LocalDateTime.class)
        );
        verify(messageRepository).recalculateAggregateStatusesForChat(5L, 1L);
    }

    @Test
    void markChatAsReadWritesReceipt() {
        when(userIdentityService.require("alice")).thenReturn(alice);
        when(currentDeviceService.requireCurrentDevice()).thenReturn(aliceDevice);
        when(participantRepository.existsByChatIdAndUserId(5L, 1L)).thenReturn(true);
        when(participantRepository.findUserIdsByChatId(5L)).thenReturn(List.of(1L, 2L));
        when(messageRepository.findDistinctSenderIdsByChatIdAndSenderIdNotAndStatusNot(5L, 1L, Message.MessageStatus.READ))
                .thenReturn(List.of(2L));
        when(messageReceiptRepository.upsertReadForChat(eq(5L), eq(1L), eq("device-alice-1"), any(java.time.LocalDateTime.class)))
                .thenReturn(1);
        when(participantRepository.findDistinctUsernamesByChatId(5L)).thenReturn(List.of("alice", "bob"));
        when(userDeviceRepository.findByUserIdInAndActiveTrue(List.of(2L))).thenReturn(List.of());

        messageService.markChatAsRead("alice", 5L);

        verify(unreadService).reset(1L, 5L);
        verify(messageReceiptRepository).upsertReadForChat(
                eq(5L), eq(1L), eq("device-alice-1"), any(java.time.LocalDateTime.class)
        );
        verify(messageRepository).recalculateAggregateStatusesForChat(5L, 1L);
    }

    @Test
    void senderCannotUpdateOwnStatus() {
        Message msg = TestFixtures.sentMessage(1L, 5L, 1L, "device-alice");

        when(userIdentityService.require("alice")).thenReturn(alice);
        when(currentDeviceService.requireCurrentDevice()).thenReturn(aliceDevice);
        when(messageRepository.findById(1L)).thenReturn(Optional.of(msg));
        when(participantRepository.existsByChatIdAndUserId(5L, 1L)).thenReturn(true);

        messageService.updateMessageStatus("alice", 1L, "READ");

        verify(messageReceiptRepository, never()).save(any());
        verify(messageRepository, never()).save(any());
    }

    @Test
    void toggleReactionAddsReaction() throws Exception {
        Message msg = TestFixtures.sentMessage(100L, 5L, 2L, "device-bob-1");

        when(userIdentityService.require("alice")).thenReturn(alice);
        when(currentDeviceService.requireCurrentDevice()).thenReturn(aliceDevice);
        when(messageRepository.findById(100L)).thenReturn(Optional.of(msg));
        when(participantRepository.existsByChatIdAndUserId(5L, 1L)).thenReturn(true);
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        when(participantRepository.findUserIdsByChatId(5L)).thenReturn(List.of(1L, 2L));
        when(userDeviceRepository.findByUserIdInAndActiveTrue(any())).thenReturn(List.of());
        when(participantRepository.findDistinctUsernamesByChatId(5L)).thenReturn(List.of("alice", "bob"));

        ReactionEvent event = messageService.toggleReaction("alice", 100L, "👍");

        assertThat(event.type()).isEqualTo("MESSAGE_REACTION");
        assertThat(event.emoji()).isEqualTo("👍");
        assertThat(event.active()).isTrue();

        verify(messageReactionRepository).save(argThat(reaction ->
                reaction.getMessageId().equals(100L)
                        && reaction.getChatId().equals(5L)
                        && reaction.getUserId().equals(1L)
                        && reaction.getEmoji().equals("👍")
        ));
    }

    private static EncryptedSendMessageRequestV2 sendRequest(Long chatId, String clientMessageId, String senderDeviceId) {
        return new EncryptedSendMessageRequestV2(
                chatId,
                clientMessageId,
                senderDeviceId,
                List.of(new EncryptedMessageEnvelopeInput(
                        "device-alice-1", 1L, "WHISPER", "identity",
                        null, "ciphertext", "nonce", null, null, null, 1
                ))
        );
    }
}
