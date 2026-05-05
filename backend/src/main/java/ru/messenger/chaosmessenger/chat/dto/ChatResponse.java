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
        String otherAvatarUrl,
        long unreadCount,
        boolean online,
        LocalDateTime lastSeen
) {}
