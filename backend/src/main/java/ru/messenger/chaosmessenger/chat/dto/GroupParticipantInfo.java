package ru.messenger.chaosmessenger.chat.dto;

import java.time.LocalDateTime;

/**
 * Lightweight participant projection for group chat responses: who is in the group
 * and what role they hold. Used to render the participants screen on the client.
 */
public record GroupParticipantInfo(
        Long userId,
        String username,
        String firstName,
        String lastName,
        String avatarUrl,
        String role,
        LocalDateTime mutedUntil,
        boolean banned
) {
}
