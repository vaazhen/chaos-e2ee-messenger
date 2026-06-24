package ru.messenger.chaosmessenger.crypto.dto;

import java.util.List;

public record PreKeyBundleResponse(
        String username,
        List<DeviceBundleDto> devices
) {
}
