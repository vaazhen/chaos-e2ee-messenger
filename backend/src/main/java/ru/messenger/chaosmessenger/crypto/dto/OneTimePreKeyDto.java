package ru.messenger.chaosmessenger.crypto.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record OneTimePreKeyDto(
        @NotNull(message = "One-time pre-key ID is required")
        Integer preKeyId,
        @NotBlank(message = "One-time pre-key public key is required")
        @Size(max = 4096, message = "One-time pre-key public key is too long")
        String publicKey
) {}
