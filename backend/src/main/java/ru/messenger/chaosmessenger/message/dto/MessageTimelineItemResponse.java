package ru.messenger.chaosmessenger.message.dto;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

public record MessageTimelineItemResponse(
        Long id,
        Long chatId,
        Long senderId,
        String senderDeviceId,
        String clientMessageId,
        Integer version,
        boolean deleted,
        LocalDateTime createdAt,
        LocalDateTime editedAt,
        String status,
        TimelineEnvelopeDto envelope,
        Map<String, Long> reactions,
        Set<String> myReactions
) {}
