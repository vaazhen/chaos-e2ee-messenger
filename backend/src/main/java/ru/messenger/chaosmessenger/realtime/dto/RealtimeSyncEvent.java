package ru.messenger.chaosmessenger.realtime.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;

public record RealtimeSyncEvent(
        long sequence,
        String eventId,
        String destination,
        JsonNode payload,
        Instant createdAt
) {
}
