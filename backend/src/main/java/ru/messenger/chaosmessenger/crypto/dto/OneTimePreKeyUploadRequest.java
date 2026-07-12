package ru.messenger.chaosmessenger.crypto.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record OneTimePreKeyUploadRequest(
        @Valid
        @NotEmpty(message = "At least one one-time pre-key is required")
        @Size(max = 200, message = "Too many one-time pre-keys")
        List<OneTimePreKeyDto> oneTimePreKeys
) {
}
