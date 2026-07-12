package ru.messenger.chaosmessenger.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyCodeRequest(
        @NotBlank(message = "Phone number is required")
        @Size(max = 32, message = "Phone number is too long")
        String phone,
        @NotBlank(message = "Verification code is required")
        @Pattern(regexp = "\\d{6}", message = "Verification code must contain exactly 6 digits")
        String code
) {
}
