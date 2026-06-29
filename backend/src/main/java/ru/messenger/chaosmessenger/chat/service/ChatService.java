package ru.messenger.chaosmessenger.chat.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.messenger.chaosmessenger.chat.access.ChatQueryService;
import ru.messenger.chaosmessenger.chat.dto.ChatResponse;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupParticipantsRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupPermissionsRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupRoleRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupSettingsRequest;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final DirectChatService directChatService;
    private final SavedMessagesService savedMessagesService;
    private final GroupModerationService groupModerationService;
    private final ChatQueryService chatQueryService;

    public Long createDirectChat(String currentUsername, Long targetUserId) {
        return directChatService.createDirectChat(currentUsername, targetUserId);
    }

    public Long createOrGetDirectChatByUsername(String currentUsername, String targetUsername) {
        return directChatService.createOrGetDirectChatByUsername(currentUsername, targetUsername);
    }

    public Long createOrGetSavedMessagesChat(String currentUsername) {
        return savedMessagesService.createOrGetSavedMessagesChat(currentUsername);
    }

    public Long createGroupChat(String currentUsername, String name, List<Long> memberIds) {
        return groupModerationService.createGroupChat(currentUsername, name, memberIds);
    }

    public void acceptDirectRequest(String username, Long chatId) {
        directChatService.acceptDirectRequest(username, chatId);
    }

    public void declineDirectRequest(String username, Long chatId) {
        directChatService.declineDirectRequest(username, chatId);
    }

    public ChatResponse inviteGroupParticipants(String username, Long chatId, UpdateGroupParticipantsRequest request) {
        return groupModerationService.inviteGroupParticipants(username, chatId, request);
    }

    public ChatResponse updateGroupSettings(String username, Long chatId, UpdateGroupSettingsRequest request) {
        return groupModerationService.updateGroupSettings(username, chatId, request);
    }

    public ChatResponse updateGroupParticipantRole(String username, Long chatId, Long targetUserId, UpdateGroupRoleRequest request) {
        return groupModerationService.updateGroupParticipantRole(username, chatId, targetUserId, request);
    }

    public ChatResponse updateGroupPermissions(String username, Long chatId, UpdateGroupPermissionsRequest request) {
        return groupModerationService.updateGroupPermissions(username, chatId, request);
    }

    public void removeGroupParticipant(String username, Long chatId, Long targetUserId) {
        groupModerationService.removeGroupParticipant(username, chatId, targetUserId);
    }

    public void archiveGroup(String username, Long chatId) {
        groupModerationService.archiveGroup(username, chatId);
    }

    public void deleteChatForEveryone(String username, Long chatId) {
        groupModerationService.deleteChatForEveryone(username, chatId);
    }

    public ChatResponse muteGroupParticipant(String username, Long chatId, Long targetUserId, Integer minutes) {
        return groupModerationService.muteGroupParticipant(username, chatId, targetUserId, minutes);
    }

    public ChatResponse unmuteGroupParticipant(String username, Long chatId, Long targetUserId) {
        return groupModerationService.unmuteGroupParticipant(username, chatId, targetUserId);
    }

    public ChatResponse banGroupParticipant(String username, Long chatId, Long targetUserId, String reason) {
        return groupModerationService.banGroupParticipant(username, chatId, targetUserId, reason);
    }

    public ChatResponse unbanGroupParticipant(String username, Long chatId, Long targetUserId) {
        return groupModerationService.unbanGroupParticipant(username, chatId, targetUserId);
    }

    public List<ChatResponse> getMyChats(String username, int offset, int limit) {
        return chatQueryService.getMyChats(username, offset, limit);
    }

    public List<ChatResponse> getMyDirectRequests(String username, int offset, int limit) {
        return chatQueryService.getMyDirectRequests(username, offset, limit);
    }
}
