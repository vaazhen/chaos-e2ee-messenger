package ru.messenger.chaosmessenger.chat.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * PATCH body for changing a participant's role in a group chat. Must be one of
 * {@code OWNER}, {@code ADMIN}, {@code MODERATOR}, {@code MEMBER}.
 */
public record UpdateGroupRoleRequest(
        @NotBlank(message = "role is required")
        String role
) {
}
