package ru.messenger.chaosmessenger.crypto.dto;

public record MessageEnvelopeDto(
        Long chatId,
        String senderDeviceId,
        String recipientDeviceId,
        String messageType,
        String senderIdentityPublicKey,
        String ephemeralPublicKey,
        String ciphertext,
        String nonce,
        Integer signedPreKeyId,
        Integer oneTimePreKeyId,
        Long timestamp,
        Integer messageIndex,
        String ratchetPublicKey,
        Integer previousChainLength
) {
}
