package ru.messenger.chaosmessenger.crypto.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record DeviceRegistrationRequest(
        @NotBlank(message = "Device ID is required")
        @Size(max = 100, message = "Device ID is too long")
        String deviceId,
        @NotBlank(message = "Device name is required")
        @Size(max = 255, message = "Device name is too long")
        String deviceName,
        @NotNull(message = "Registration ID is required")
        @Positive(message = "Registration ID must be positive")
        Integer registrationId,
        @NotBlank(message = "Identity public key is required")
        @Size(max = 4096, message = "Identity public key is too long")
        String identityPublicKey,
        @NotBlank(message = "Signing public key is required")
        @Size(max = 4096, message = "Signing public key is too long")
        String signingPublicKey,
        @Valid
        @NotNull(message = "Signed pre-key is required")
        SignedPreKeyDto signedPreKey,
        @Valid
        @Size(max = 500, message = "Too many one-time pre-keys")
        List<OneTimePreKeyDto> oneTimePreKeys
) {}
