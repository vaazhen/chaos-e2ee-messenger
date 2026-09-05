package ru.messenger.chaosmessenger.crypto.api;

import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import ru.messenger.chaosmessenger.auth.service.CredentialRateLimiter;
import ru.messenger.chaosmessenger.auth.service.DeviceRegistrationTokenService;
import ru.messenger.chaosmessenger.crypto.device.CurrentDeviceService;
import ru.messenger.chaosmessenger.crypto.device.DeviceService;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.crypto.dto.DeviceRegistrationRequest;
import ru.messenger.chaosmessenger.crypto.dto.DeviceRegistrationResponse;
import ru.messenger.chaosmessenger.crypto.dto.OneTimePreKeyPoolResponse;
import ru.messenger.chaosmessenger.crypto.dto.OneTimePreKeyUploadRequest;
import ru.messenger.chaosmessenger.crypto.dto.UserDeviceResponse;

import java.util.List;

/**
 * Device registration and management endpoints.
 */
@Tag(name = "Crypto / Devices", description = "X3DH key bundle and device management")
@RestController
@RequestMapping("/api/crypto/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService                  deviceService;
    private final CurrentDeviceService           currentDeviceService;
    private final DeviceRegistrationTokenService deviceRegTokenService;
    private final CredentialRateLimiter credentialRateLimiter;

    @Operation(
            summary = "Register a device and upload its X3DH key bundle",
            description = "New devices require X-Device-Registration-Token from login. "
                    + "An authenticated session may re-bind an existing device only when identity keys match."
    )
    @PostMapping("/register")
    public DeviceRegistrationResponse register(
            @RequestHeader(value = "X-Device-Registration-Token", required = false) String registrationToken,
            Authentication authentication,
            @Valid @RequestBody DeviceRegistrationRequest request
    ) {
        boolean enrollment = registrationToken != null && !registrationToken.isBlank();
        String username;
        if (enrollment) {
            username = deviceRegTokenService.consumeAndGetUsername(registrationToken);
            if (username == null) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid or expired device registration token. Obtain a fresh token from login."
                );
            }
        } else if (isAuthenticatedPrincipal(authentication)) {
            username = authentication.getName();
        } else {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Missing device registration token. Obtain a fresh token from login."
            );
        }

        return deviceService.registerDevice(username, request, enrollment);
    }

    @Operation(
            summary = "Validate current device",
            description = "Requires JWT authentication and X-Device-Id. Used by frontend after page reload."
    )
    @GetMapping("/current")
    public DeviceRegistrationResponse current(
            Authentication authentication,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId
    ) {
        requireAuth(authentication);

        if (deviceId == null || deviceId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "X-Device-Id header is required");
        }

        return deviceService.findCurrentDevice(authentication.getName(), deviceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Current device is not registered or inactive"
                ));
    }

    @Operation(summary = "List my registered devices")
    @GetMapping("/my")
    public List<UserDeviceResponse> myDevices(
            Authentication authentication,
            @RequestHeader(value = "X-Device-Id", required = false) String currentDeviceId
    ) {
        requireAuth(authentication);
        return deviceService.listMyDevices(authentication.getName(), currentDeviceId);
    }

    @Operation(summary = "Get the available one-time pre-key count for the current device")
    @GetMapping("/current/prekeys")
    public OneTimePreKeyPoolResponse oneTimePreKeyCount() {
        UserDevice device = currentDeviceService.requireCurrentDevice();
        return new OneTimePreKeyPoolResponse(deviceService.availableOneTimePreKeys(device));
    }

    @Operation(summary = "Append one-time pre-keys for the current device")
    @PostMapping("/current/prekeys")
    public OneTimePreKeyPoolResponse appendOneTimePreKeys(
            @Valid @RequestBody OneTimePreKeyUploadRequest request,
            Authentication authentication
    ) {
        UserDevice device = currentDeviceService.requireCurrentDevice();
        credentialRateLimiter.checkUserAction(
                authentication != null ? authentication.getName() : device.getDeviceId(),
                "prekey"
        );
        int available = deviceService.appendOneTimePreKeys(device, request.oneTimePreKeys());
        return new OneTimePreKeyPoolResponse(available);
    }

    @Operation(summary = "Deactivate one of my devices")
    @PostMapping("/{internalDeviceId}/deactivate")
    public UserDeviceResponse deactivateDevice(
            @PathVariable Long internalDeviceId,
            @RequestParam(defaultValue = "false") boolean confirmLastDevice,
            Authentication authentication,
            @RequestHeader(value = "X-Device-Id", required = false) String currentDeviceId
    ) {
        requireAuth(authentication);
        return deviceService.deactivateDevice(
                authentication.getName(),
                internalDeviceId,
                confirmLastDevice,
                currentDeviceId
        );
    }

    private void requireAuth(Authentication authentication) {
        if (!isAuthenticatedPrincipal(authentication)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "JWT authentication is required");
        }
    }

    private static boolean isAuthenticatedPrincipal(Authentication authentication) {
        if (authentication == null) {
            return false;
        }
        String name = authentication.getName();
        return name != null && !name.isBlank() && !"anonymousUser".equalsIgnoreCase(name);
    }
}