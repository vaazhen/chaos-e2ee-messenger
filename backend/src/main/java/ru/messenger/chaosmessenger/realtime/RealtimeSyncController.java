package ru.messenger.chaosmessenger.realtime;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.messenger.chaosmessenger.auth.service.CredentialRateLimiter;
import ru.messenger.chaosmessenger.crypto.device.CurrentDeviceService;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.realtime.dto.RealtimeSyncResponse;

@Validated
@RestController
@RequestMapping("/api/realtime")
@RequiredArgsConstructor
public class RealtimeSyncController {

    private final CurrentDeviceService currentDeviceService;
    private final RealtimeEventStore realtimeEventStore;
    private final CredentialRateLimiter credentialRateLimiter;

    @GetMapping("/sync")
    public RealtimeSyncResponse sync(
            @RequestParam(defaultValue = "0") @Min(0) long after,
            @RequestParam(defaultValue = "200") @Min(1) @Max(RealtimeSyncLimits.MAX) int limit
    ) {
        UserDevice device = currentDeviceService.requireCurrentDevice();
        String username = device.getUser() == null ? device.getDeviceId() : device.getUser().getUsername();
        credentialRateLimiter.checkUserAction(username, "sync");
        return realtimeEventStore.readAfter(device.getDeviceId(), after, limit);
    }
}
