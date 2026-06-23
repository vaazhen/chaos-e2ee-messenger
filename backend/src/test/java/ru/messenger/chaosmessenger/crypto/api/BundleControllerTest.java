package ru.messenger.chaosmessenger.crypto.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import ru.messenger.chaosmessenger.crypto.device.CurrentDeviceService;
import ru.messenger.chaosmessenger.crypto.dto.DeviceBundleDto;
import ru.messenger.chaosmessenger.crypto.dto.PreKeyBundleResponse;
import ru.messenger.chaosmessenger.crypto.dto.ResolvedChatDevicesResponse;
import ru.messenger.chaosmessenger.crypto.prekey.PreKeyService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BundleControllerTest {

    @Mock PreKeyService preKeyService;
    @Mock CurrentDeviceService currentDeviceService;
    @Mock Authentication authentication;

    @InjectMocks BundleController bundleController;

    @Test
    void getBundleDelegatesToPreKeyService() {
        PreKeyBundleResponse expected = new PreKeyBundleResponse(
                "dev-a", 1, "identity-key", "signed-pre-key",
                "signature", null
        );

        when(authentication.getName()).thenReturn("alice");
        when(currentDeviceService.requireCurrentDevice()).thenReturn(null);
        when(preKeyService.getBundleByUsername("bob")).thenReturn(expected);

        PreKeyBundleResponse response = bundleController.getBundle("bob", authentication);

        assertThat(response).isSameAs(expected);
        verify(currentDeviceService).requireCurrentDevice();
        verify(preKeyService).getBundleByUsername("bob");
    }

    @Test
    void resolveChatDevicesDelegatesToPreKeyService() {
        ResolvedChatDevicesResponse expected = new ResolvedChatDevicesResponse(100L, null);

        when(authentication.getName()).thenReturn("alice");
        when(currentDeviceService.requireCurrentDevice()).thenReturn(null);
        when(preKeyService.resolveChatDevices("alice", 100L)).thenReturn(expected);

        ResolvedChatDevicesResponse response = bundleController.resolveChatDevices(100L, authentication);

        assertThat(response).isSameAs(expected);
        verify(currentDeviceService).requireCurrentDevice();
        verify(preKeyService).resolveChatDevices("alice", 100L);
    }

    @Test
    void reserveOneTimePreKeyDelegatesToPreKeyService() {
        DeviceBundleDto expected = new DeviceBundleDto("dev-b", 1, "key", null);

        when(authentication.getName()).thenReturn("alice");
        when(currentDeviceService.requireCurrentDevice()).thenReturn(null);
        when(preKeyService.reserveChatDeviceOneTimePreKey("alice", 100L, "dev-b"))
                .thenReturn(expected);

        DeviceBundleDto response = bundleController.reserveOneTimePreKey(100L, "dev-b", authentication);

        assertThat(response).isSameAs(expected);
        verify(currentDeviceService).requireCurrentDevice();
        verify(preKeyService).reserveChatDeviceOneTimePreKey("alice", 100L, "dev-b");
    }
}
