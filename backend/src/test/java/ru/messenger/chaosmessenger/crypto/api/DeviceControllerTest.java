package ru.messenger.chaosmessenger.crypto.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import ru.messenger.chaosmessenger.auth.service.DeviceRegistrationTokenService;
import ru.messenger.chaosmessenger.crypto.device.DeviceService;
import ru.messenger.chaosmessenger.crypto.dto.DeviceRegistrationRequest;
import ru.messenger.chaosmessenger.crypto.dto.DeviceRegistrationResponse;
import ru.messenger.chaosmessenger.crypto.dto.OneTimePreKeyDto;
import ru.messenger.chaosmessenger.crypto.dto.SignedPreKeyDto;
import ru.messenger.chaosmessenger.crypto.dto.UserDeviceResponse;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeviceControllerTest {

    @Mock DeviceService deviceService;
    @Mock DeviceRegistrationTokenService deviceRegTokenService;
    @Mock Authentication authentication;

    @InjectMocks DeviceController deviceController;

    @Test
    void registerThrowsWhenTokenIsMissing() {
        DeviceRegistrationRequest request = new DeviceRegistrationRequest(
                "dev-a", "device-name", 1, "identity", "signed-key",
                new SignedPreKeyDto(1, "pre-key", "sig"),
                List.of(new OneTimePreKeyDto(1, "pre-key"))
        );

        assertThatThrownBy(() -> deviceController.register(null, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void registerThrowsWhenTokenIsBlank() {
        DeviceRegistrationRequest request = new DeviceRegistrationRequest(
                "dev-a", "device-name", 1, "identity", "signed-key",
                new SignedPreKeyDto(1, "pre-key", "sig"),
                List.of(new OneTimePreKeyDto(1, "pre-key"))
        );

        assertThatThrownBy(() -> deviceController.register("   ", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void registerThrowsWhenTokenIsInvalid() {
        DeviceRegistrationRequest request = new DeviceRegistrationRequest(
                "dev-a", "device-name", 1, "identity", "signed-key",
                new SignedPreKeyDto(1, "pre-key", "sig"),
                List.of(new OneTimePreKeyDto(1, "pre-key"))
        );

        when(deviceRegTokenService.consumeAndGetUsername("bad-token")).thenReturn(null);

        assertThatThrownBy(() -> deviceController.register("bad-token", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void registerDelegatesToDeviceService() {
        DeviceRegistrationRequest request = new DeviceRegistrationRequest(
                "dev-a", "device-name", 1, "identity", "signed-key",
                new SignedPreKeyDto(1, "pre-key", "sig"),
                List.of(new OneTimePreKeyDto(1, "pre-key"))
        );
        DeviceRegistrationResponse expected = new DeviceRegistrationResponse(
                "dev-a", 10L
        );

        when(deviceRegTokenService.consumeAndGetUsername("valid-token")).thenReturn("alice");
        when(deviceService.registerDevice("alice", request)).thenReturn(expected);

        DeviceRegistrationResponse response = deviceController.register("valid-token", request);

        assertThat(response).isSameAs(expected);
        verify(deviceRegTokenService).consumeAndGetUsername("valid-token");
        verify(deviceService).registerDevice("alice", request);
    }

    @Test
    void currentRequiresAuthentication() {
        assertThatThrownBy(() -> deviceController.current(null, "dev-a"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void currentRequiresDeviceId() {
        when(authentication.getName()).thenReturn("alice");

        assertThatThrownBy(() -> deviceController.current(authentication, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void currentReturnsDeviceWhenFound() {
        DeviceRegistrationResponse expected = new DeviceRegistrationResponse(
                "dev-a", 10L
        );

        when(authentication.getName()).thenReturn("alice");
        when(deviceService.findCurrentDevice("alice", "dev-a"))
                .thenReturn(Optional.of(expected));

        DeviceRegistrationResponse response = deviceController.current(authentication, "dev-a");

        assertThat(response).isSameAs(expected);
    }

    @Test
    void currentThrowsWhenDeviceNotFound() {
        when(authentication.getName()).thenReturn("alice");
        when(deviceService.findCurrentDevice("alice", "dev-a"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> deviceController.current(authentication, "dev-a"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void myDevicesRequiresAuthentication() {
        assertThatThrownBy(() -> deviceController.myDevices(null, "dev-a"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void myDevicesDelegatesToDeviceService() {
        UserDeviceResponse device = new UserDeviceResponse(
                1L, "dev-a", "device-name", true, false, null, null
        );

        when(authentication.getName()).thenReturn("alice");
        when(deviceService.listMyDevices("alice", "dev-a")).thenReturn(List.of(device));

        List<UserDeviceResponse> response = deviceController.myDevices(authentication, "dev-a");

        assertThat(response).containsExactly(device);
        verify(deviceService).listMyDevices("alice", "dev-a");
    }

    @Test
    void deactivateDeviceRequiresAuthentication() {
        assertThatThrownBy(() -> deviceController.deactivateDevice(1L, false, null, "dev-a"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void deactivateDeviceDelegatesToDeviceService() {
        UserDeviceResponse expected = new UserDeviceResponse(
                1L, "dev-a", "device-name", false, false, null, null
        );

        when(authentication.getName()).thenReturn("alice");
        when(deviceService.deactivateDevice("alice", 1L, true, "dev-a"))
                .thenReturn(expected);

        UserDeviceResponse response = deviceController.deactivateDevice(1L, true, authentication, "dev-a");

        assertThat(response).isSameAs(expected);
        verify(deviceService).deactivateDevice("alice", 1L, true, "dev-a");
    }
}
