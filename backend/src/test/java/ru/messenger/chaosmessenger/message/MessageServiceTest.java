package ru.messenger.chaosmessenger.message;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedEditMessageRequestV2;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedSendMessageRequestV2;
import ru.messenger.chaosmessenger.message.dto.DeviceMessageEventResponse;
import ru.messenger.chaosmessenger.message.dto.MessageTimelineItemResponse;
import ru.messenger.chaosmessenger.message.dto.ReactionEvent;
import ru.messenger.chaosmessenger.message.service.MessageDeleteService;
import ru.messenger.chaosmessenger.message.service.MessageEditService;
import ru.messenger.chaosmessenger.message.service.MessageReactionService;
import ru.messenger.chaosmessenger.message.service.MessageReceiptService;
import ru.messenger.chaosmessenger.message.service.MessageSendService;
import ru.messenger.chaosmessenger.message.service.MessageService;
import ru.messenger.chaosmessenger.message.service.MessageTimelineService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MessageService facade delegates to sub-services")
class MessageServiceTest {

    @Mock MessageSendService messageSendService;
    @Mock MessageEditService messageEditService;
    @Mock MessageDeleteService messageDeleteService;
    @Mock MessageReceiptService messageReceiptService;
    @Mock MessageReactionService messageReactionService;
    @Mock MessageTimelineService messageTimelineService;

    @InjectMocks MessageService messageService;

    @Test
    @DisplayName("sendEncryptedMessageV2 delegates to MessageSendService")
    void sendEncryptedMessageV2() {
        var request = mock(EncryptedSendMessageRequestV2.class);
        var response = mock(DeviceMessageEventResponse.class);
        when(messageSendService.sendEncryptedMessageV2("alice", request)).thenReturn(response);
        assertThat(messageService.sendEncryptedMessageV2("alice", request)).isSameAs(response);
    }

    @Test
    @DisplayName("editEncryptedMessageV2 delegates to MessageEditService")
    void editEncryptedMessageV2() {
        var request = mock(EncryptedEditMessageRequestV2.class);
        var response = mock(DeviceMessageEventResponse.class);
        when(messageEditService.editEncryptedMessageV2("alice", 500L, request)).thenReturn(response);
        assertThat(messageService.editEncryptedMessageV2("alice", 500L, request)).isSameAs(response);
    }

    @Test
    @DisplayName("getChatTimeline delegates to MessageTimelineService")
    void getChatTimeline() {
        var response = mock(MessageTimelineItemResponse.class);
        when(messageTimelineService.getChatTimeline("alice", 100L, 50L, 25)).thenReturn(List.of(response));
        assertThat(messageService.getChatTimeline("alice", 100L, 50L, 25)).containsExactly(response);
    }

    @Test
    @DisplayName("deleteMessage delegates to MessageDeleteService")
    void deleteMessage() {
        messageService.deleteMessage("alice", 500L);
        verify(messageDeleteService).deleteMessage("alice", 500L);
    }

    @Test
    @DisplayName("markChatAsRead delegates to MessageReceiptService")
    void markChatAsRead() {
        messageService.markChatAsRead("alice", 100L);
        verify(messageReceiptService).markChatAsRead("alice", 100L);
    }

    @Test
    @DisplayName("markChatAsDelivered delegates to MessageReceiptService")
    void markChatAsDelivered() {
        messageService.markChatAsDelivered("alice", 100L);
        verify(messageReceiptService).markChatAsDelivered("alice", 100L);
    }

    @Test
    @DisplayName("updateMessageStatus delegates to MessageReceiptService")
    void updateMessageStatus() {
        messageService.updateMessageStatus("alice", 500L, "READ");
        verify(messageReceiptService).updateMessageStatus("alice", 500L, "READ");
    }

    @Test
    @DisplayName("toggleReaction delegates to MessageReactionService")
    void toggleReaction() {
        var response = mock(ReactionEvent.class);
        when(messageReactionService.toggleReaction("alice", 500L, "👍")).thenReturn(response);
        assertThat(messageService.toggleReaction("alice", 500L, "👍")).isSameAs(response);
    }
}
