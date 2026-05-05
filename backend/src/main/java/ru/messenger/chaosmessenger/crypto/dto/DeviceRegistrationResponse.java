package ru.messenger.chaosmessenger.crypto.dto;

public record DeviceRegistrationResponse(
        String deviceId,
        Long serverDeviceInternalId
) {}
