package ru.messenger.chaosmessenger.chat.access;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import ru.messenger.chaosmessenger.chat.domain.Chat;
import ru.messenger.chaosmessenger.chat.domain.ChatParticipant;
import ru.messenger.chaosmessenger.chat.domain.GroupPolicy;
import ru.messenger.chaosmessenger.chat.domain.GroupRole;
import ru.messenger.chaosmessenger.chat.dto.ChatListUpdateEvent;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.chat.repository.ChatRepository;
import ru.messenger.chaosmessenger.common.exception.ChatException;
import ru.messenger.chaosmessenger.outbox.OutboxService;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatAccessService {

    private final ChatRepository chatRepository;
    private final ChatParticipantRepository participantRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageSource messageSource;
    private final OutboxService outboxService;

    @Value("${chaos.kafka.enabled:false}")
    private boolean kafkaEnabled;

    public Chat requireActiveGroup(Long chatId) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ChatException("Chat not found"));
        if (!"GROUP".equals(chat.getType())) throw new ChatException("Not a group chat");
        if (chat.getDeletedAt() != null) throw new ChatException("Group is archived");
        return chat;
    }

    public ChatParticipant requireParticipantEntity(Long chatId, Long userId) {
        return participantRepository.findByChatIdAndUserId(chatId, userId)
                .orElseThrow(() -> new ChatException("Not a chat participant"));
    }

    public void requirePolicy(GroupRole role, GroupPolicy policy, String message) {
        if (!role.atLeast(policy.minRole())) throw new ChatException(message);
    }

    public void validateRoleChange(ChatParticipant actor, ChatParticipant target, GroupRole targetRole) {
        GroupRole actorRole = actor.groupRole();
        GroupRole currentTargetRole = target.groupRole();
        if (actorRole == GroupRole.MEMBER) {
            throw new ChatException("You have no rights to change participant role");
        }
        if (actorRole == GroupRole.MODERATOR) {
            throw new ChatException("Moderators cannot change participant roles");
        }
        if (currentTargetRole == GroupRole.OWNER && actorRole != GroupRole.OWNER) {
            throw new ChatException("Owner role cannot be changed by non-owner");
        }
        if (targetRole == GroupRole.OWNER && actorRole != GroupRole.OWNER) {
            throw new ChatException("Only owner can transfer ownership");
        }
        if (actorRole == GroupRole.ADMIN) {
            if (currentTargetRole == GroupRole.ADMIN) {
                throw new ChatException("Admins cannot change roles of other admins");
            }
            if (targetRole == GroupRole.ADMIN) {
                throw new ChatException("Admins cannot assign admin role");
            }
        }
        if (!actorRole.atLeast(currentTargetRole) || !actorRole.atLeast(targetRole)) {
            throw new ChatException("You cannot assign or manage higher role than your own");
        }
    }

    public void validateCanModerate(ChatParticipant actor, ChatParticipant target, Long actorUserId, String action) {
        GroupRole actorRole = actor.groupRole();
        GroupRole targetRole = target.groupRole();
        if (Objects.equals(actor.getUserId(), target.getUserId()) || Objects.equals(actorUserId, target.getUserId())) {
            throw new ChatException("Self moderation actions are not allowed");
        }
        if (actorRole == GroupRole.MEMBER) {
            throw new ChatException("Members cannot " + action);
        }
        if (targetRole == GroupRole.OWNER) {
            throw new ChatException("Owner cannot be targeted by moderation actions");
        }
        if (actorRole == GroupRole.MODERATOR) {
            if (targetRole != GroupRole.MEMBER) {
                throw new ChatException("Moderators can only moderate members");
            }
            return;
        }
        if (actorRole == GroupRole.ADMIN && targetRole != GroupRole.MEMBER && targetRole != GroupRole.MODERATOR) {
            throw new ChatException("Admins cannot moderate owner/admin");
        }
        if (!actorRole.atLeast(targetRole)) {
            throw new ChatException("You can only moderate lower or equal roles");
        }
    }

    public String normalizeReason(String reason) {
        if (reason == null) return null;
        String normalized = reason.trim();
        if (normalized.isBlank()) return null;
        return normalized.length() > 255 ? normalized.substring(0, 255) : normalized;
    }

    public GroupRole parseRole(String role) {
        if (role == null || role.isBlank()) throw new ChatException("Role is required");
        try {
            return GroupRole.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ChatException("Unsupported role: " + role);
        }
    }

    public GroupPolicy parsePolicy(String value, boolean allowAllAlias) {
        if (value == null || value.isBlank()) throw new ChatException("Policy is required");
        try {
            GroupPolicy policy = GroupPolicy.valueOf(value.trim().toUpperCase());
            if (allowAllAlias && policy == GroupPolicy.ANYONE) return GroupPolicy.ALL;
            if (!allowAllAlias && policy == GroupPolicy.ALL) return GroupPolicy.ANYONE;
            return policy;
        } catch (IllegalArgumentException e) {
            throw new ChatException("Unsupported policy: " + value);
        }
    }

    public String savedChatName() {
        return messageSource.getMessage("chat.saved.name", null, "Saved Messages", LocaleContextHolder.getLocale());
    }

    private final Set<String> seenOutboxEvents = ConcurrentHashMap.newKeySet();

    public void notifyChatListUpdated(String username, Long chatId, String reason) {
        if (!kafkaEnabled) {
            messagingTemplate.convertAndSend(
                    "/topic/users/" + username + "/chats",
                    ChatListUpdateEvent.forChat(chatId, reason)
            );
        }
        writeChatOutboxEvent(chatId, reason, false);
    }

    public void notifyRequestsUpdated(String username, Long chatId, String reason) {
        if (!kafkaEnabled) {
            messagingTemplate.convertAndSend(
                    "/topic/users/" + username + "/requests",
                    ChatListUpdateEvent.forChat(chatId, reason)
            );
        }
        writeChatOutboxEvent(chatId, reason, true);
    }

    private void writeChatOutboxEvent(Long chatId, String reason, boolean isRequest) {
        String dedupKey = chatId + ":" + reason;
        if (!seenOutboxEvents.add(dedupKey)) return;

        try {
            List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);
            String aggregateType = isRequest ? "request" : "chat";
            outboxService.write(aggregateType, String.valueOf(chatId), reason.toUpperCase(), Map.of(
                    "chatId", chatId,
                    "eventType", reason.toUpperCase(),
                    "reason", reason,
                    "participantUsernames", participantUsernames
            ));
        } catch (Exception e) {
            log.warn("Failed to write outbox event for chat {}: {}", chatId, reason, e);
        }
    }
}
