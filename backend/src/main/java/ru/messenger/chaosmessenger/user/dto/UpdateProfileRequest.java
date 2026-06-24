package ru.messenger.chaosmessenger.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 100, message = "First name is too long")
        String firstName,
        @Size(max = 100, message = "Last name is too long")
        String lastName,
        @Size(max = 262144, message = "Avatar URL is too long")
        String avatarUrl,
        @Size(min = 3, max = 32, message = "Username must be between 3 and 32 characters")
        @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username may only contain letters, digits and underscores")
        String username
) {
}
