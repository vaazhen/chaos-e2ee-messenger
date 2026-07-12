package ru.messenger.chaosmessenger.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmailLoginRequest(
        @Email(message = "Invalid email")
        @NotBlank(message = "Email is required")
        String email,
        @NotBlank(message = "Password is required")
        @Size(max = 72, message = "Password is too long")
        String password
) {
}
