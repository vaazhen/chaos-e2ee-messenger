package ru.messenger.chaosmessenger.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendCodeRequest(
        @NotBlank(message = "Phone number is required")
        @Size(max = 32, message = "Phone number is too long")
        String phone,
        @Size(max = 16, message = "Delivery channel is too long")
        String via
) {
}
