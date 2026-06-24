package ru.messenger.chaosmessenger.chat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.messenger.chaosmessenger.chat.access.ChatQueryService;
import ru.messenger.chaosmessenger.chat.dto.ChatResponse;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupParticipantsRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupPermissionsRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupRoleRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupSettingsRequest;
import ru.messenger.chaosmessenger.chat.service.ChatService;
import ru.messenger.chaosmessenger.chat.service.DirectChatService;
import ru.messenger.chaosmessenger.chat.service.GroupModerationService;
import ru.messenger.chaosmessenger.chat.service.SavedMessagesService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatService facade delegates to sub-services")
class ChatServiceTest {

    @Mock DirectChatService directChatService;
    @Mock SavedMessagesService savedMessagesService;
    @Mock GroupModerationService groupModerationService;
    @Mock ChatQueryService chatQueryService;

    @InjectMocks ChatService chatService;

    @Test
    @DisplayName("createDirectChat delegates to DirectChatService")
    void createDirectChat() {
        when(directChatService.createDirectChat("alice", 2L)).thenReturn(10L);
        assertThat(chatService.createDirectChat("alice", 2L)).isEqualTo(10L);
    }

    @Test
    @DisplayName("createOrGetDirectChatByUsername delegates to DirectChatService")
    void createOrGetDirectChatByUsername() {
        when(directChatService.createOrGetDirectChatByUsername("alice", "bob")).thenReturn(10L);
        assertThat(chatService.createOrGetDirectChatByUsername("alice", "bob")).isEqualTo(10L);
    }

    @Test
    @DisplayName("createOrGetSavedMessagesChat delegates to SavedMessagesService")
    void createOrGetSavedMessagesChat() {
        when(savedMessagesService.createOrGetSavedMessagesChat("alice")).thenReturn(10L);
        assertThat(chatService.createOrGetSavedMessagesChat("alice")).isEqualTo(10L);
    }

    @Test
    @DisplayName("createGroupChat delegates to GroupModerationService")
    void createGroupChat() {
        when(groupModerationService.createGroupChat("alice", "Team", List.of(2L))).thenReturn(20L);
        assertThat(chatService.createGroupChat("alice", "Team", List.of(2L))).isEqualTo(20L);
    }

    @Test
    @DisplayName("acceptDirectRequest delegates to DirectChatService")
    void acceptDirectRequest() {
        chatService.acceptDirectRequest("alice", 10L);
        verify(directChatService).acceptDirectRequest("alice", 10L);
    }

    @Test
    @DisplayName("declineDirectRequest delegates to DirectChatService")
    void declineDirectRequest() {
        chatService.declineDirectRequest("alice", 10L);
        verify(directChatService).declineDirectRequest("alice", 10L);
    }

    @Test
    @DisplayName("inviteGroupParticipants delegates to GroupModerationService")
    void inviteGroupParticipants() {
        var request = new UpdateGroupParticipantsRequest(List.of(3L));
        var response = mock(ChatResponse.class);
        when(groupModerationService.inviteGroupParticipants("alice", 20L, request)).thenReturn(response);
        assertThat(chatService.inviteGroupParticipants("alice", 20L, request)).isSameAs(response);
    }

    @Test
    @DisplayName("updateGroupSettings delegates to GroupModerationService")
    void updateGroupSettings() {
        var request = new UpdateGroupSettingsRequest("NewName", null, null);
        var response = mock(ChatResponse.class);
        when(groupModerationService.updateGroupSettings("alice", 20L, request)).thenReturn(response);
        assertThat(chatService.updateGroupSettings("alice", 20L, request)).isSameAs(response);
    }

    @Test
    @DisplayName("updateGroupParticipantRole delegates to GroupModerationService")
    void updateGroupParticipantRole() {
        var request = new UpdateGroupRoleRequest("ADMIN");
        var response = mock(ChatResponse.class);
        when(groupModerationService.updateGroupParticipantRole("alice", 20L, 2L, request)).thenReturn(response);
        assertThat(chatService.updateGroupParticipantRole("alice", 20L, 2L, request)).isSameAs(response);
    }

    @Test
    @DisplayName("updateGroupPermissions delegates to GroupModerationService")
    void updateGroupPermissions() {
        var request = new UpdateGroupPermissionsRequest("ALL", null, null);
        var response = mock(ChatResponse.class);
        when(groupModerationService.updateGroupPermissions("alice", 20L, request)).thenReturn(response);
        assertThat(chatService.updateGroupPermissions("alice", 20L, request)).isSameAs(response);
    }

    @Test
    @DisplayName("removeGroupParticipant delegates to GroupModerationService")
    void removeGroupParticipant() {
        chatService.removeGroupParticipant("alice", 20L, 2L);
        verify(groupModerationService).removeGroupParticipant("alice", 20L, 2L);
    }

    @Test
    @DisplayName("archiveGroup delegates to GroupModerationService")
    void archiveGroup() {
        chatService.archiveGroup("alice", 20L);
        verify(groupModerationService).archiveGroup("alice", 20L);
    }

    @Test
    @DisplayName("deleteChatForEveryone delegates to GroupModerationService")
    void deleteChatForEveryone() {
        chatService.deleteChatForEveryone("alice", 20L);
        verify(groupModerationService).deleteChatForEveryone("alice", 20L);
    }

    @Test
    @DisplayName("muteGroupParticipant delegates to GroupModerationService")
    void muteGroupParticipant() {
        var response = mock(ChatResponse.class);
        when(groupModerationService.muteGroupParticipant("alice", 20L, 2L, 15)).thenReturn(response);
        assertThat(chatService.muteGroupParticipant("alice", 20L, 2L, 15)).isSameAs(response);
    }

    @Test
    @DisplayName("unmuteGroupParticipant delegates to GroupModerationService")
    void unmuteGroupParticipant() {
        var response = mock(ChatResponse.class);
        when(groupModerationService.unmuteGroupParticipant("alice", 20L, 2L)).thenReturn(response);
        assertThat(chatService.unmuteGroupParticipant("alice", 20L, 2L)).isSameAs(response);
    }

    @Test
    @DisplayName("banGroupParticipant delegates to GroupModerationService")
    void banGroupParticipant() {
        var response = mock(ChatResponse.class);
        when(groupModerationService.banGroupParticipant("alice", 20L, 2L, "spam")).thenReturn(response);
        assertThat(chatService.banGroupParticipant("alice", 20L, 2L, "spam")).isSameAs(response);
    }

    @Test
    @DisplayName("unbanGroupParticipant delegates to GroupModerationService")
    void unbanGroupParticipant() {
        var response = mock(ChatResponse.class);
        when(groupModerationService.unbanGroupParticipant("alice", 20L, 2L)).thenReturn(response);
        assertThat(chatService.unbanGroupParticipant("alice", 20L, 2L)).isSameAs(response);
    }

    @Test
    @DisplayName("getMyChats delegates to ChatQueryService")
    void getMyChats() {
        var response = mock(ChatResponse.class);
        when(chatQueryService.getMyChats("alice", 0, 100)).thenReturn(List.of(response));
        assertThat(chatService.getMyChats("alice", 0, 100)).containsExactly(response);
    }

    @Test
    @DisplayName("getMyDirectRequests delegates to ChatQueryService")
    void getMyDirectRequests() {
        var response = mock(ChatResponse.class);
        when(chatQueryService.getMyDirectRequests("alice", 0, 100)).thenReturn(List.of(response));
        assertThat(chatService.getMyDirectRequests("alice", 0, 100)).containsExactly(response);
    }
}
