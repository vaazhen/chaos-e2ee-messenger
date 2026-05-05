package ru.messenger.chaosmessenger.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CompleteSetupRequest(
        @NotBlank(message = "Setup token is required")
        String setupToken,
        @NotBlank(message = "First name is required")
        String firstName,
        String lastName,
        @NotBlank(message = "Username is required")
        String username,
        @Size(max = 262144, message = "Avatar URL is too long")
        String avatarUrl
) {}
