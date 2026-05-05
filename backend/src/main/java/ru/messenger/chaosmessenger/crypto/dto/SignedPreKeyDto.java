package ru.messenger.chaosmessenger.crypto.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SignedPreKeyDto(
        @NotNull(message = "Signed pre-key ID is required")
        Integer preKeyId,
        @NotBlank(message = "Signed pre-key public key is required")
        @Size(max = 4096, message = "Signed pre-key public key is too long")
        String publicKey,
        @NotBlank(message = "Signed pre-key signature is required")
        @Size(max = 4096, message = "Signed pre-key signature is too long")
        String signature
) {}
