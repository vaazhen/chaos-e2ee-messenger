package ru.messenger.chaosmessenger.crypto.device;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DeviceSessionBinder {

    private final UserDeviceRepository userDeviceRepository;

    @Transactional
    public void bind(String username, String deviceId, String familyId) {
        if (username == null || username.isBlank()
                || deviceId == null || deviceId.isBlank()
                || familyId == null || familyId.isBlank()) {
            return;
        }
        userDeviceRepository.findByUserUsernameAndDeviceIdAndActiveTrue(username, deviceId)
                .ifPresent(device -> {
                    if (!familyId.equals(device.getSessionFamilyId())) {
                        device.setSessionFamilyId(familyId);
                        userDeviceRepository.save(device);
                    }
                });
    }
}
