package ru.messenger.chaosmessenger.crypto.dto;

public record DeviceBundleDto(
        Long userId,
        Long deviceDbId,
        String deviceId,
        Integer registrationId,
        String deviceName,
        String identityPublicKey,
        String signingPublicKey,
        SignedPreKeyDto signedPreKey,
        OneTimePreKeyDto oneTimePreKey
) {}
