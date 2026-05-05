package ru.messenger.chaosmessenger.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record CompleteSetupRequest(
        @NotBlank(message = "Setup token is required")
        String setupToken,
        @NotBlank(message = "First name is required")
        String firstName,
        String lastName,
        @NotBlank(message = "Username is required")
        String username,
        String avatarUrl
) {}
