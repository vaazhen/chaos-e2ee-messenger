package ru.messenger.chaosmessenger.crypto.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record EncryptedSendMessageRequestV2(
        @NotNull(message = "Chat ID is required")
        Long chatId,
        @NotBlank(message = "Client message ID is required")
        @Size(max = 100, message = "Client message ID is too long")
        String clientMessageId,
        @NotBlank(message = "Sender device ID is required")
        @Size(max = 100, message = "Sender device ID is too long")
        String senderDeviceId,
        @Valid
        @NotEmpty(message = "At least one encrypted envelope is required")
        @Size(max = 1000, message = "Too many encrypted envelopes")
        List<EncryptedMessageEnvelopeInput> envelopes
) {}
