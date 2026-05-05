package ru.messenger.chaosmessenger.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmailRegisterRequest(
        @Email(message = "Invalid email")
        @NotBlank(message = "Email is required")
        String email,
        @Size(min = 6, max = 72)
        @NotBlank(message = "Password is required")
        String password,
        String username,
        String firstName,
        String lastName,
        String avatarUrl
) {}
