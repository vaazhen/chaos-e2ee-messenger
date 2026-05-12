package ru.messenger.chaosmessenger.message.dto;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

public record DeviceMessageEventResponse(
        String type,
        Long messageId,
        Long chatId,
        Long senderId,
        String senderDeviceId,
        String clientMessageId,
        Integer version,
        LocalDateTime createdAt,
        LocalDateTime editedAt,
        LocalDateTime deletedAt,
        String status,
        TimelineEnvelopeDto envelope,
        Map<String, Long> reactions,
        Set<String> myReactions,
        LocalDateTime expiresAt
) {}
