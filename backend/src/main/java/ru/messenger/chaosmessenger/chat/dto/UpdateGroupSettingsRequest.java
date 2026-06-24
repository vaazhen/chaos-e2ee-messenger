package ru.messenger.chaosmessenger.chat.dto;

import jakarta.validation.constraints.Size;

/**
 * PATCH body for updating group profile (name / avatar / bio).
 *
 * <p>{@code null} fields are left untouched. Empty strings clear the value.
 */
public record UpdateGroupSettingsRequest(
        @Size(max = 100, message = "Group name is too long")
        String name,
        String avatarUrl,
        @Size(max = 280, message = "Group bio is too long")
        String bio
) {
}
