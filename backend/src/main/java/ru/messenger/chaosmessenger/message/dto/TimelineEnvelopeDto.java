package ru.messenger.chaosmessenger.message.dto;

public record TimelineEnvelopeDto(
        String targetDeviceId,
        String messageType,
        String senderIdentityPublicKey,
        String ephemeralPublicKey,
        String ciphertext,
        String nonce,
        Integer signedPreKeyId,
        Integer oneTimePreKeyId,
        Integer messageIndex,
        String ratchetPublicKey,
        Integer previousChainLength
) {}
