package ru.messenger.chaosmessenger.crypto.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record EncryptedEditMessageRequestV2(
        @NotBlank(message = "Sender device ID is required")
        @Size(max = 100, message = "Sender device ID is too long")
        String senderDeviceId,
        @Valid
        @NotEmpty(message = "At least one encrypted envelope is required")
        @Size(max = 1000, message = "Too many encrypted envelopes")
        List<EncryptedMessageEnvelopeInput> envelopes
) {}
