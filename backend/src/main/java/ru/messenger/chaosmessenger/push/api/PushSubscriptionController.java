package ru.messenger.chaosmessenger.push.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import ru.messenger.chaosmessenger.crypto.device.CurrentDeviceService;
import ru.messenger.chaosmessenger.push.dto.PushSubscriptionRequest;
import ru.messenger.chaosmessenger.push.service.PushNotificationService;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.service.UserIdentityService;

@Tag(name = "Push Notifications", description = "Web Push subscription management")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
public class PushSubscriptionController {

    private final PushNotificationService pushNotificationService;
    private final UserIdentityService userIdentityService;
    private final CurrentDeviceService currentDeviceService;

    @Operation(summary = "Subscribe to push notifications")
    @PostMapping("/subscribe")
    public void subscribe(@RequestBody PushSubscriptionRequest request, Authentication auth) {
        User user = userIdentityService.require(auth.getName());
        String deviceId = currentDeviceService.requireCurrentDevice().getDeviceId();
        pushNotificationService.subscribe(
                user.getId(),
                deviceId,
                request.endpoint(),
                request.p256dh(),
                request.auth()
        );
    }

    @Operation(summary = "Unsubscribe from push notifications")
    @DeleteMapping("/unsubscribe")
    public void unsubscribe(Authentication auth) {
        User user = userIdentityService.require(auth.getName());
        String deviceId = currentDeviceService.requireCurrentDevice().getDeviceId();
        pushNotificationService.unsubscribe(user.getId(), deviceId);
    }

    @Operation(summary = "Get VAPID public key")
    @GetMapping("/vapid-public-key")
    public String getVapidPublicKey() {
        return pushNotificationService.getVapidPublicKey();
    }
}
