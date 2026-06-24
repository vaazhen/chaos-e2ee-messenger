package ru.messenger.chaosmessenger.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyCodeRequest(
        @NotBlank(message = "Phone number is required")
        String phone,
        @NotBlank(message = "Verification code is required")
        String code
) {
}
