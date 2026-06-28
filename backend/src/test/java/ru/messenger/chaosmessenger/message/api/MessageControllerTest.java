package ru.messenger.chaosmessenger.message.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import ru.messenger.chaosmessenger.crypto.device.CurrentDeviceService;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedEditMessageRequestV2;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedMessageEnvelopeInput;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedSendMessageRequestV2;
import ru.messenger.chaosmessenger.infra.ws.WebSocketAuthChannelInterceptor;
import ru.messenger.chaosmessenger.message.application.TypingService;
import ru.messenger.chaosmessenger.message.dto.DeviceMessageEventResponse;
import ru.messenger.chaosmessenger.message.dto.MessageTimelineItemResponse;
import ru.messenger.chaosmessenger.message.dto.ReactionEvent;
import ru.messenger.chaosmessenger.message.dto.ReactionRequest;
import ru.messenger.chaosmessenger.message.dto.TypingEvent;
import ru.messenger.chaosmessenger.message.dto.TypingRequest;
import ru.messenger.chaosmessenger.message.dto.UpdateMessageStatusRequest;
import ru.messenger.chaosmessenger.message.service.MessageService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageControllerTest {

    @Mock MessageService messageService;
    @Mock CurrentDeviceService currentDeviceService;
    @Mock Authentication authentication;
    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock WebSocketAuthChannelInterceptor authInterceptor;
    @Mock TypingService typingService;

    @InjectMocks MessageController messageController;
    @InjectMocks TypingController typingController;

    @Test
    void sendEncryptedMessageRequiresCurrentDeviceAndDelegatesToService() {
        EncryptedSendMessageRequestV2 request = sendRequest();
        DeviceMessageEventResponse expected = eventResponse("MESSAGE_CREATED");

        when(authentication.getName()).thenReturn("alice");
        when(currentDeviceService.requireCurrentDevice()).thenReturn(new UserDevice());
        when(messageService.sendEncryptedMessageV2("alice", request)).thenReturn(expected);

        DeviceMessageEventResponse response = messageController.sendEncryptedMessage(request, authentication);

        assertThat(response).isSameAs(expected);
        verify(currentDeviceService).requireCurrentDevice();
        verify(messageService).sendEncryptedMessageV2("alice", request);
    }

    @Test
    void getChatTimelineRequiresCurrentDeviceAndDelegatesToService() {
        MessageTimelineItemResponse item = new MessageTimelineItemResponse(
                1L, 100L, 1L, "dev-a", "client-1", 1,
                false, LocalDateTime.now(), null, "SENT", null, Map.of(), Set.of(), null
        );

        when(authentication.getName()).thenReturn("alice");
        when(currentDeviceService.requireCurrentDevice()).thenReturn(new UserDevice());
        when(messageService.getChatTimeline("alice", 100L, 50L, 25)).thenReturn(List.of(item));

        List<MessageTimelineItemResponse> response =
                messageController.getChatTimeline(100L, 50L, 25, authentication);

        assertThat(response).containsExactly(item);
        verify(currentDeviceService).requireCurrentDevice();
        verify(messageService).getChatTimeline("alice", 100L, 50L, 25);
    }

    @Test
    void markChatReadRequiresCurrentDeviceAndDelegatesToService() {
        when(authentication.getName()).thenReturn("alice");
        when(currentDeviceService.requireCurrentDevice()).thenReturn(new UserDevice());

        messageController.markChatRead(100L, authentication);

        verify(currentDeviceService).requireCurrentDevice();
        verify(messageService).markChatAsRead("alice", 100L);
    }

    @Test
    void markChatDeliveredRequiresCurrentDeviceAndDelegatesToService() {
        when(authentication.getName()).thenReturn("alice");
        when(currentDeviceService.requireCurrentDevice()).thenReturn(new UserDevice());

        messageController.markChatDelivered(100L, authentication);

        verify(currentDeviceService).requireCurrentDevice();
        verify(messageService).markChatAsDelivered("alice", 100L);
    }

    @Test
    void updateStatusRequiresCurrentDeviceAndDelegatesToService() {
        UpdateMessageStatusRequest request = new UpdateMessageStatusRequest(500L, "READ");

        when(authentication.getName()).thenReturn("alice");
        when(currentDeviceService.requireCurrentDevice()).thenReturn(new UserDevice());

        messageController.updateStatus(request, authentication);

        verify(currentDeviceService).requireCurrentDevice();
        verify(messageService).updateMessageStatus("alice", 500L, "READ");
    }

    @Test
    void editEncryptedMessageRequiresCurrentDeviceAndDelegatesToService() {
        EncryptedEditMessageRequestV2 request = editRequest();
        DeviceMessageEventResponse expected = eventResponse("MESSAGE_EDITED");

        when(authentication.getName()).thenReturn("alice");
        when(currentDeviceService.requireCurrentDevice()).thenReturn(new UserDevice());
        when(messageService.editEncryptedMessageV2("alice", 500L, request)).thenReturn(expected);

        DeviceMessageEventResponse response = messageController.editMessage(500L, request, authentication);

        assertThat(response).isSameAs(expected);
        verify(currentDeviceService).requireCurrentDevice();
        verify(messageService).editEncryptedMessageV2("alice", 500L, request);
    }

    @Test
    void toggleReactionRequiresCurrentDeviceAndDelegatesToService() {
        ReactionRequest request = new ReactionRequest("👍");
        ReactionEvent expected = new ReactionEvent(
                "REACTION_UPDATED", 500L, 100L, 1L, "dev-a", "👍",
                true, Map.of("👍", 1L), 123L
        );

        when(authentication.getName()).thenReturn("alice");
        when(currentDeviceService.requireCurrentDevice()).thenReturn(new UserDevice());
        when(messageService.toggleReaction("alice", 500L, "👍")).thenReturn(expected);

        ReactionEvent response = messageController.toggleReaction(500L, request, authentication);

        assertThat(response).isSameAs(expected);
        verify(currentDeviceService).requireCurrentDevice();
        verify(messageService).toggleReaction("alice", 500L, "👍");
    }

    @Test
    void deleteMessageRequiresCurrentDeviceAndReturnsSuccess() {
        when(authentication.getName()).thenReturn("alice");
        when(currentDeviceService.requireCurrentDevice()).thenReturn(new UserDevice());

        var response = messageController.deleteMessage(500L, authentication);

        assertThat(response.success()).isTrue();
        verify(currentDeviceService).requireCurrentDevice();
        verify(messageService).deleteMessage("alice", 500L);
    }

    @Test
    void typingSendsEventWhenSessionIsAuthenticatedAndUserIsParticipant() {
        TypingRequest request = new TypingRequest(100L, true);

        when(authInterceptor.getUsernameBySessionId("session-1")).thenReturn("alice");
        when(typingService.isTypingAllowed("alice", 100L)).thenReturn(true);

        typingController.typing(request, "session-1");

        ArgumentCaptor<TypingEvent> captor = ArgumentCaptor.forClass(TypingEvent.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/chats/100/typing"), captor.capture());

        assertThat(captor.getValue().username()).isEqualTo("alice");
        assertThat(captor.getValue().typing()).isTrue();
    }

    @Test
    void typingDoesNotSendWhenSessionHasNoUsername() {
        TypingRequest request = new TypingRequest(100L, true);

        when(authInterceptor.getUsernameBySessionId("session-1")).thenReturn(null);

        typingController.typing(request, "session-1");

        verify(messagingTemplate, never()).convertAndSend(
                eq("/topic/chats/100/typing"),
                org.mockito.ArgumentMatchers.any(TypingEvent.class)
        );
    }

    @Test
    void typingDoesNotSendWhenUserIsNotChatParticipant() {
        TypingRequest request = new TypingRequest(100L, true);

        when(authInterceptor.getUsernameBySessionId("session-1")).thenReturn("alice");
        when(typingService.isTypingAllowed("alice", 100L)).thenReturn(false);

        typingController.typing(request, "session-1");

        verify(messagingTemplate, never()).convertAndSend(
                eq("/topic/chats/100/typing"),
                org.mockito.ArgumentMatchers.any(TypingEvent.class)
        );
    }

    private static EncryptedSendMessageRequestV2 sendRequest() {
        return new EncryptedSendMessageRequestV2(100L, "client-1", "dev-a", List.of(envelope()), null);
    }

    private static EncryptedEditMessageRequestV2 editRequest() {
        return new EncryptedEditMessageRequestV2("dev-a", List.of(envelope()));
    }

    private static EncryptedMessageEnvelopeInput envelope() {
        return new EncryptedMessageEnvelopeInput(
                "dev-b", 2L, "WHISPER", "identity", null, "ciphertext",
                "nonce", null, null, 123L, 1, null, null
        );
    }

    private static DeviceMessageEventResponse eventResponse(String type) {
        return new DeviceMessageEventResponse(
                type, 500L, 100L, 1L, "dev-a", "client-1", 1,
                LocalDateTime.now(), null, null, "SENT", null, Map.of(), Set.of(), null
        );
    }
}
