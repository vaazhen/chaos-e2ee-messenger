package ru.messenger.chaosmessenger.crypto.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EncryptedMessageEnvelopeInput(
        @NotBlank(message = "Target device ID is required")
        @Size(max = 100, message = "Target device ID is too long")
        String targetDeviceId,
        @NotNull(message = "Target user ID is required")
        Long targetUserId,
        @NotBlank(message = "Message type is required")
        @Size(max = 40, message = "Message type is too long")
        String messageType,
        @NotBlank(message = "Sender identity public key is required")
        @Size(max = 4096, message = "Sender identity public key is too long")
        String senderIdentityPublicKey,
        @Size(max = 4096, message = "Ephemeral public key is too long")
        String ephemeralPublicKey,
        @NotBlank(message = "Ciphertext is required")
        @Size(max = 262144, message = "Ciphertext is too long")
        String ciphertext,
        @NotBlank(message = "Nonce is required")
        @Size(max = 512, message = "Nonce is too long")
        String nonce,
        Integer signedPreKeyId,
        Integer oneTimePreKeyId,
        Long timestamp,
        Integer messageIndex,
        @Size(max = 4096, message = "Ratchet public key is too long")
        String ratchetPublicKey,
        Integer previousChainLength
) {
}
