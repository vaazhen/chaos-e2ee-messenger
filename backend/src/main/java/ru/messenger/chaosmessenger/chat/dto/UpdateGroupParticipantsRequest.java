package ru.messenger.chaosmessenger.chat.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * POST body for adding new participants to a group chat.
 */
public record UpdateGroupParticipantsRequest(
        @NotEmpty(message = "At least one user id is required")
        List<Long> userIds
) {
}
