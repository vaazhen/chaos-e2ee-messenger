package ru.messenger.chaosmessenger.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmailRegisterRequest(
        @Email(message = "Invalid email")
        @NotBlank(message = "Email is required")
        String email,
        @Size(min = 8, max = 72)
        @NotBlank(message = "Password is required")
        String password,
        String username,
        String firstName,
        String lastName,
        @Size(max = 262144, message = "Avatar URL is too long")
        String avatarUrl
) {
}
