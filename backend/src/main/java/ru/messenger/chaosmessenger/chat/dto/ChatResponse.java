package ru.messenger.chaosmessenger.chat.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ChatResponse(
        Long chatId,
        String type,
        String name,
        String lastMessage,
        Long lastMessageId,
        LocalDateTime lastMessageAt,
        Long lastMessageSenderId,
        List<Long> participants,
        Long otherUserId,
        String otherUsername,
        String otherFirstName,
        String otherLastName,
        String otherBio,
        String otherAvatarUrl,
        long unreadCount,
        boolean online,
        LocalDateTime lastSeen,
        String directStatus,
        Long directRequestedBy,
        // Group-only fields. Null for DIRECT/SAVED chats.
        String groupAvatarUrl,
        String groupBio,
        String whoCanWrite,
        String whoCanEditInfo,
        String whoCanInvite,
        String myRole,
        List<GroupParticipantInfo> groupParticipants
) {
    public static ChatResponse forSaved(SavedParams params) {
        return new ChatResponse(
                params.chatId(),
                params.type(),
                params.name(),
                params.lastMessage(),
                params.lastMessageId(),
                params.lastMessageAt(),
                params.lastMessageSenderId(),
                params.participants(),
                null, null, null, null, null, null,
                params.unreadCount(),
                false,
                null,
                null,
                null,
                null, null, null, null, null, null, null
        );
    }

    public static ChatResponse forGroup(GroupParams params) {
        return new ChatResponse(
                params.chatId(),
                params.type(),
                params.name(),
                params.lastMessage(),
                params.lastMessageId(),
                params.lastMessageAt(),
                params.lastMessageSenderId(),
                params.participants(),
                null, null, null, null, null, null,
                params.unreadCount(),
                false,
                null,
                null,
                null,
                params.groupAvatarUrl(),
                params.groupBio(),
                params.whoCanWrite(),
                params.whoCanEditInfo(),
                params.whoCanInvite(),
                params.myRole(),
                params.groupParticipants()
        );
    }

    public static ChatResponse forDirect(DirectParams params) {
        return new ChatResponse(
                params.chatId(),
                params.type(),
                null,
                params.lastMessage(),
                params.lastMessageId(),
                params.lastMessageAt(),
                params.lastMessageSenderId(),
                params.participants(),
                params.otherUserId(),
                params.otherUsername(),
                params.otherFirstName(),
                params.otherLastName(),
                params.otherBio(),
                params.otherAvatarUrl(),
                params.unreadCount(),
                params.online(),
                params.lastSeen(),
                params.directStatus(),
                params.directRequestedBy(),
                null, null, null, null, null, null, null
        );
    }

    public record SavedParams(
            Long chatId,
            String type,
            String name,
            String lastMessage,
            Long lastMessageId,
            LocalDateTime lastMessageAt,
            Long lastMessageSenderId,
            List<Long> participants,
            long unreadCount
    ) {}

    public record GroupParams(
            Long chatId,
            String type,
            String name,
            String lastMessage,
            Long lastMessageId,
            LocalDateTime lastMessageAt,
            Long lastMessageSenderId,
            List<Long> participants,
            long unreadCount,
            String groupAvatarUrl,
            String groupBio,
            String whoCanWrite,
            String whoCanEditInfo,
            String whoCanInvite,
            String myRole,
            List<GroupParticipantInfo> groupParticipants
    ) {}

    public record DirectParams(
            Long chatId,
            String type,
            String lastMessage,
            Long lastMessageId,
            LocalDateTime lastMessageAt,
            Long lastMessageSenderId,
            List<Long> participants,
            Long otherUserId,
            String otherUsername,
            String otherFirstName,
            String otherLastName,
            String otherBio,
            String otherAvatarUrl,
            long unreadCount,
            boolean online,
            LocalDateTime lastSeen,
            String directStatus,
            Long directRequestedBy
    ) {}
}
