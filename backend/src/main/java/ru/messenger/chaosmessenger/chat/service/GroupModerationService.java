package ru.messenger.chaosmessenger.chat.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.access.ChatAccessService;
import ru.messenger.chaosmessenger.chat.access.ChatQueryService;
import ru.messenger.chaosmessenger.chat.domain.Chat;
import ru.messenger.chaosmessenger.chat.domain.ChatParticipant;
import ru.messenger.chaosmessenger.chat.domain.GroupPolicy;
import ru.messenger.chaosmessenger.chat.domain.GroupRole;
import ru.messenger.chaosmessenger.chat.dto.ChatResponse;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupParticipantsRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupPermissionsRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupRoleRequest;
import ru.messenger.chaosmessenger.chat.dto.UpdateGroupSettingsRequest;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.chat.repository.ChatRepository;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.common.exception.ChatException;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupModerationService {

    private final ChatRepository chatRepository;
    private final ChatParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final ChatAccessService chatAccessService;
    private final ChatQueryService chatQueryService;

    @Transactional
    public Long createGroupChat(String currentUsername, String name, List<Long> memberIds) {
        if (name == null || name.isBlank()) {
            throw new ChatException("Group name is required");
        }
        if (memberIds == null || memberIds.isEmpty()) {
            throw new ChatException("Group must have at least one other member");
        }

        User creator = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ChatException("Current user not found"));

        List<Long> distinctMemberIds = memberIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        List<Long> otherMemberIds = distinctMemberIds.stream()
                .filter(id -> !id.equals(creator.getId()))
                .toList();
        if (otherMemberIds.isEmpty()) {
            throw new ChatException("Group must have at least one other member");
        }

        List<User> members = userRepository.findAllById(otherMemberIds);
        Set<Long> foundMemberIds = members.stream()
                .map(User::getId)
                .collect(Collectors.toSet());
        if (!foundMemberIds.containsAll(otherMemberIds)) {
            throw new ChatException("One or more member users not found");
        }

        Chat chat = new Chat();
        chat.setType("GROUP");
        chat.setName(name.trim());
        chat.setWhoCanWrite("ALL");
        chat.setWhoCanEditInfo("ADMINS");
        chat.setWhoCanInvite("ADMINS");
        chat.setCreatedAt(LocalDateTime.now());
        chat = chatRepository.save(chat);

        List<ChatParticipant> participantsToSave = new ArrayList<>();
        participantsToSave.add(new ChatParticipant(chat.getId(), creator.getId(), GroupRole.OWNER));
        for (User member : members) {
            participantsToSave.add(new ChatParticipant(chat.getId(), member.getId(), GroupRole.MEMBER));
        }
        participantRepository.saveAll(participantsToSave);

        final Long chatId = chat.getId();
        final List<String> notifyUsers = members.stream()
                .map(User::getUsername)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(ArrayList::new));
        notifyUsers.add(creator.getUsername());
        final List<String> distinctNotifyUsers = notifyUsers.stream().distinct().toList();
        TransactionUtils.afterCommit(() ->
                distinctNotifyUsers.forEach(u -> chatAccessService.notifyChatListUpdated(u, chatId, "chat_created")));

        return chatId;
    }

    @Transactional
    public ChatResponse inviteGroupParticipants(String username, Long chatId, UpdateGroupParticipantsRequest request) {
        User actor = userRepository.findByUsername(username)
                .orElseThrow(() -> new ChatException("User not found"));
        Chat chat = chatAccessService.requireActiveGroup(chatId);
        ChatParticipant actorParticipant = chatAccessService.requireParticipantEntity(chatId, actor.getId());

        GroupPolicy invitePolicy = GroupPolicy.fromString(chat.getWhoCanInvite(), GroupPolicy.ADMINS);
        chatAccessService.requirePolicy(actorParticipant.groupRole(), invitePolicy, "You have no rights to invite participants");

        List<Long> rawIds = request == null ? List.of() : request.userIds();
        if (rawIds == null || rawIds.isEmpty()) {
            throw new ChatException("At least one user id is required");
        }

        List<Long> distinctIds = rawIds.stream().filter(Objects::nonNull).distinct().toList();
        if (distinctIds.isEmpty()) {
            throw new ChatException("At least one user id is required");
        }
        if (distinctIds.contains(actor.getId())) {
            throw new ChatException("You cannot invite yourself");
        }

        Set<Long> existingUserIds = participantRepository.findByChatId(chatId).stream()
                .map(ChatParticipant::getUserId)
                .collect(Collectors.toSet());
        List<Long> alreadyMembers = distinctIds.stream().filter(existingUserIds::contains).toList();
        if (!alreadyMembers.isEmpty()) {
            throw new ChatException("Some users are already group members");
        }

        List<User> usersToInvite = userRepository.findAllById(distinctIds);
        Set<Long> foundIds = usersToInvite.stream().map(User::getId).collect(Collectors.toSet());
        if (!foundIds.containsAll(distinctIds)) {
            throw new ChatException("One or more users not found");
        }

        List<ChatParticipant> added = usersToInvite.stream()
                .map(u -> new ChatParticipant(chatId, u.getId(), GroupRole.MEMBER))
                .toList();
        participantRepository.saveAll(added);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() -> {
            chatAccessService.notifyChatListUpdated(username, chatId, "group_participants_invited");
            participantUsernames.forEach(u ->
                    chatAccessService.notifyChatListUpdated(u, chatId, "group_participants_invited"));
        });

        return chatQueryService.getChatForUser(username, chatId);
    }

    @Transactional
    public ChatResponse updateGroupSettings(String username, Long chatId, UpdateGroupSettingsRequest request) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        Chat chat = chatAccessService.requireActiveGroup(chatId);
        ChatParticipant actorParticipant = chatAccessService.requireParticipantEntity(chatId, actor.getId());

        GroupPolicy editPolicy = GroupPolicy.fromString(chat.getWhoCanEditInfo(), GroupPolicy.ADMINS);
        chatAccessService.requirePolicy(actorParticipant.groupRole(), editPolicy, "You have no rights to edit group info");

        if (request.name() != null) {
            String normalizedName = request.name().trim();
            if (normalizedName.isBlank()) {
                throw new ChatException("Group name is required");
            }
            chat.setName(normalizedName);
        }
        if (request.avatarUrl() != null) {
            String avatar = request.avatarUrl().trim();
            chat.setAvatarUrl(avatar.isBlank() ? null : avatar);
        }
        if (request.bio() != null) {
            String bio = request.bio().trim();
            chat.setBio(bio.isBlank() ? null : bio);
        }
        chatRepository.save(chat);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        chatAccessService.notifyChatListUpdated(u, chatId, "group_settings_updated")));

        return chatQueryService.getChatForUser(username, chatId);
    }

    @Transactional
    public ChatResponse updateGroupParticipantRole(String username, Long chatId, Long targetUserId, UpdateGroupRoleRequest request) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        chatAccessService.requireActiveGroup(chatId);

        participantRepository.findByChatIdForUpdate(chatId);
        ChatParticipant actorParticipant = chatAccessService.requireParticipantEntity(chatId, actor.getId());
        ChatParticipant targetParticipant = chatAccessService.requireParticipantEntity(chatId, targetUserId);
        GroupRole targetRole = chatAccessService.parseRole(request.role());
        chatAccessService.validateRoleChange(actorParticipant, targetParticipant, targetRole);

        if (targetRole == GroupRole.OWNER) {
            actorParticipant.setGroupRole(GroupRole.ADMIN);
            participantRepository.save(actorParticipant);
        }
        targetParticipant.setGroupRole(targetRole);
        participantRepository.save(targetParticipant);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        chatAccessService.notifyChatListUpdated(u, chatId, "group_role_updated")));

        return chatQueryService.getChatForUser(username, chatId);
    }

    @Transactional
    public ChatResponse updateGroupPermissions(String username, Long chatId, UpdateGroupPermissionsRequest request) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        Chat chat = chatAccessService.requireActiveGroup(chatId);
        ChatParticipant actorParticipant = chatAccessService.requireParticipantEntity(chatId, actor.getId());
        if (actorParticipant.groupRole() != GroupRole.OWNER) {
            throw new ChatException("Only owner can change group permissions");
        }

        if (request.whoCanWrite() != null) {
            chat.setWhoCanWrite(chatAccessService.parsePolicy(request.whoCanWrite(), true).name());
        }
        if (request.whoCanEditInfo() != null) {
            chat.setWhoCanEditInfo(chatAccessService.parsePolicy(request.whoCanEditInfo(), false).name());
        }
        if (request.whoCanInvite() != null) {
            chat.setWhoCanInvite(chatAccessService.parsePolicy(request.whoCanInvite(), false).name());
        }
        chatRepository.save(chat);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        chatAccessService.notifyChatListUpdated(u, chatId, "group_permissions_updated")));

        return chatQueryService.getChatForUser(username, chatId);
    }

    @Transactional
    public void removeGroupParticipant(String username, Long chatId, Long targetUserId) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        chatAccessService.requireActiveGroup(chatId);
        ChatParticipant actorParticipant = chatAccessService.requireParticipantEntity(chatId, actor.getId());
        ChatParticipant targetParticipant = chatAccessService.requireParticipantEntity(chatId, targetUserId);

        chatAccessService.validateCanModerate(actorParticipant, targetParticipant, actor.getId(), "remove participants");

        participantRepository.delete(targetParticipant);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);
        TransactionUtils.afterCommit(() -> {
            chatAccessService.notifyChatListUpdated(username, chatId, "group_participant_removed");
            participantUsernames.forEach(u ->
                    chatAccessService.notifyChatListUpdated(u, chatId, "group_participant_removed"));
        });
    }

    @Transactional
    public void archiveGroup(String username, Long chatId) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        Chat chat = chatAccessService.requireActiveGroup(chatId);
        ChatParticipant actorParticipant = chatAccessService.requireParticipantEntity(chatId, actor.getId());
        if (actorParticipant.groupRole() != GroupRole.OWNER) {
            throw new ChatException("Only owner can delete group");
        }
        chat.setDeletedAt(LocalDateTime.now());
        chatRepository.save(chat);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        chatAccessService.notifyChatListUpdated(u, chatId, "group_archived")));
    }

    @Transactional
    public void deleteChatForEveryone(String username, Long chatId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ChatException("User not found"));
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ChatException("Chat not found"));

        if (!participantRepository.existsByChatIdAndUserId(chatId, user.getId())) {
            throw new ChatException("Not a chat participant");
        }

        if ("GROUP".equals(chat.getType())) {
            ChatParticipant actorParticipant = participantRepository.findByChatIdAndUserId(chatId, user.getId())
                    .orElseThrow(() -> new ChatException("Not a chat participant"));
            if (actorParticipant.groupRole() != GroupRole.OWNER) {
                throw new ChatException("Only owner can delete group");
            }
        }

        chat.setDeletedAt(LocalDateTime.now());
        chatRepository.save(chat);

        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);
        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        chatAccessService.notifyChatListUpdated(u, chatId, "chat_deleted_for_everyone")));
    }

    @Transactional
    public ChatResponse muteGroupParticipant(String username, Long chatId, Long targetUserId, Integer minutes) {
        if (minutes == null || minutes < 1 || minutes > 43200) {
            throw new ChatException("Mute duration must be between 1 and 43200 minutes");
        }
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        chatAccessService.requireActiveGroup(chatId);
        ChatParticipant actorParticipant = chatAccessService.requireParticipantEntity(chatId, actor.getId());
        ChatParticipant targetParticipant = chatAccessService.requireParticipantEntity(chatId, targetUserId);
        chatAccessService.validateCanModerate(actorParticipant, targetParticipant, actor.getId(), "mute participants");

        targetParticipant.setMutedUntil(LocalDateTime.now().plusMinutes(minutes));
        participantRepository.save(targetParticipant);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        chatAccessService.notifyChatListUpdated(u, chatId, "group_participant_muted")));
        return chatQueryService.getChatForUser(username, chatId);
    }

    @Transactional
    public ChatResponse unmuteGroupParticipant(String username, Long chatId, Long targetUserId) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        chatAccessService.requireActiveGroup(chatId);
        ChatParticipant actorParticipant = chatAccessService.requireParticipantEntity(chatId, actor.getId());
        ChatParticipant targetParticipant = chatAccessService.requireParticipantEntity(chatId, targetUserId);
        chatAccessService.validateCanModerate(actorParticipant, targetParticipant, actor.getId(), "unmute participants");

        targetParticipant.setMutedUntil(null);
        participantRepository.save(targetParticipant);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);
        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        chatAccessService.notifyChatListUpdated(u, chatId, "group_participant_unmuted")));
        return chatQueryService.getChatForUser(username, chatId);
    }

    @Transactional
    public ChatResponse banGroupParticipant(String username, Long chatId, Long targetUserId, String reason) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        chatAccessService.requireActiveGroup(chatId);
        ChatParticipant actorParticipant = chatAccessService.requireParticipantEntity(chatId, actor.getId());
        ChatParticipant targetParticipant = chatAccessService.requireParticipantEntity(chatId, targetUserId);
        chatAccessService.validateCanModerate(actorParticipant, targetParticipant, actor.getId(), "ban participants");

        targetParticipant.setBannedAt(LocalDateTime.now());
        targetParticipant.setBannedBy(actor.getId());
        targetParticipant.setBanReason(chatAccessService.normalizeReason(reason));
        targetParticipant.setMutedUntil(null);
        participantRepository.save(targetParticipant);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);
        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        chatAccessService.notifyChatListUpdated(u, chatId, "group_participant_banned")));
        return chatQueryService.getChatForUser(username, chatId);
    }

    @Transactional
    public ChatResponse unbanGroupParticipant(String username, Long chatId, Long targetUserId) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        chatAccessService.requireActiveGroup(chatId);
        ChatParticipant actorParticipant = chatAccessService.requireParticipantEntity(chatId, actor.getId());
        ChatParticipant targetParticipant = chatAccessService.requireParticipantEntity(chatId, targetUserId);
        chatAccessService.validateCanModerate(actorParticipant, targetParticipant, actor.getId(), "unban participants");

        targetParticipant.setBannedAt(null);
        targetParticipant.setBannedBy(null);
        targetParticipant.setBanReason(null);
        participantRepository.save(targetParticipant);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);
        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        chatAccessService.notifyChatListUpdated(u, chatId, "group_participant_unbanned")));
        return chatQueryService.getChatForUser(username, chatId);
    }
}
