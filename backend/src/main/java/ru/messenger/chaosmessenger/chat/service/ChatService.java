package ru.messenger.chaosmessenger.chat.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.dto.*;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final DirectChatService directChatService;
    private final SavedMessagesService savedMessagesService;
    private final GroupModerationService groupModerationService;

    @Transactional
    public Long createDirectChat(String currentUsername, Long targetUserId) {
        return directChatService.createDirectChat(currentUsername, targetUserId);
    }

    @Transactional
    public Long createOrGetDirectChatByUsername(String currentUsername, String targetUsername) {
        return directChatService.createOrGetDirectChatByUsername(currentUsername, targetUsername);
    }

    @Transactional
    public Long createOrGetSavedMessagesChat(String currentUsername) {
        return savedMessagesService.createOrGetSavedMessagesChat(currentUsername);
    }

    @Transactional
    public Long createGroupChat(String currentUsername, String name, List<Long> memberIds) {
        return groupModerationService.createGroupChat(currentUsername, name, memberIds);
    }

    @Transactional
    public void acceptDirectRequest(String username, Long chatId) {
        directChatService.acceptDirectRequest(username, chatId);
    }

    @Transactional
    public void declineDirectRequest(String username, Long chatId) {
        directChatService.declineDirectRequest(username, chatId);
    }

    @Transactional
    public ChatResponse inviteGroupParticipants(String username, Long chatId, UpdateGroupParticipantsRequest request) {
        return groupModerationService.inviteGroupParticipants(username, chatId, request);
    }

    @Transactional
    public ChatResponse updateGroupSettings(String username, Long chatId, UpdateGroupSettingsRequest request) {
        return groupModerationService.updateGroupSettings(username, chatId, request);
    }

    @Transactional
    public ChatResponse updateGroupParticipantRole(String username, Long chatId, Long targetUserId, UpdateGroupRoleRequest request) {
        return groupModerationService.updateGroupParticipantRole(username, chatId, targetUserId, request);
    }

    @Transactional
    public ChatResponse updateGroupPermissions(String username, Long chatId, UpdateGroupPermissionsRequest request) {
        return groupModerationService.updateGroupPermissions(username, chatId, request);
    }

    @Transactional
    public void removeGroupParticipant(String username, Long chatId, Long targetUserId) {
        groupModerationService.removeGroupParticipant(username, chatId, targetUserId);
    }

    @Transactional
    public void archiveGroup(String username, Long chatId) {
        groupModerationService.archiveGroup(username, chatId);
    }

    @Transactional
    public void deleteChatForEveryone(String username, Long chatId) {
        groupModerationService.deleteChatForEveryone(username, chatId);
    }

    @Transactional
    public ChatResponse muteGroupParticipant(String username, Long chatId, Long targetUserId, Integer minutes) {
        return groupModerationService.muteGroupParticipant(username, chatId, targetUserId, minutes);
    }

    @Transactional
    public ChatResponse unmuteGroupParticipant(String username, Long chatId, Long targetUserId) {
        return groupModerationService.unmuteGroupParticipant(username, chatId, targetUserId);
    }

    @Transactional
    public ChatResponse banGroupParticipant(String username, Long chatId, Long targetUserId, String reason) {
        return groupModerationService.banGroupParticipant(username, chatId, targetUserId, reason);
    }

    @Transactional
    public ChatResponse unbanGroupParticipant(String username, Long chatId, Long targetUserId) {
        return groupModerationService.unbanGroupParticipant(username, chatId, targetUserId);
    }
}
