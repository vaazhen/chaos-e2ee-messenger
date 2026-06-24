package ru.messenger.chaosmessenger.crypto.dto;

import java.util.List;

public record ResolvedChatDevicesResponse(
        Long chatId,
        String username,
        String currentDeviceId,
        List<DeviceBundleDto> targetDevices
) {
}
