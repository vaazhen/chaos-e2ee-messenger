package ru.messenger.chaosmessenger.crypto.device;


import ru.messenger.chaosmessenger.user.service.UserIdentityService;
import ru.messenger.chaosmessenger.common.exception.*;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class CurrentDeviceService {
    private static final String CURRENT_DEVICE_REQUEST_ATTR = CurrentDeviceService.class.getName() + ".CURRENT_DEVICE";

    private final HttpServletRequest request;
    private final UserDeviceRepository userDeviceRepository;
    private final UserRepository userRepository;
    private final UserIdentityService userIdentityService;

    public UserDevice requireCurrentDevice() {
        Object cached = request.getAttribute(CURRENT_DEVICE_REQUEST_ATTR);
        if (cached instanceof UserDevice device) {
            return device;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null) {
            throw new AuthException("Unauthenticated request");
        }

        String username = authentication.getName();
        String deviceId = request.getHeader("X-Device-Id");

        if (deviceId == null || deviceId.isBlank()) {
            throw new AuthException("X-Device-Id header is required");
        }

        User user = userIdentityService.require(username);

        UserDevice device = userDeviceRepository.findByUserIdAndDeviceIdAndActiveTrue(user.getId(), deviceId)
                .orElseThrow(() -> new AuthException("Active device not found for current user"));
        request.setAttribute(CURRENT_DEVICE_REQUEST_ATTR, device);
        return device;
    }
}