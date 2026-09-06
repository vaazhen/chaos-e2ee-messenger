package ru.messenger.chaosmessenger.realtime;

import org.hibernate.LazyInitializationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import ru.messenger.chaosmessenger.auth.service.CredentialRateLimiter;
import ru.messenger.chaosmessenger.crypto.device.CurrentDeviceService;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.realtime.dto.RealtimeSyncResponse;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RealtimeSyncControllerTest {

    @Mock CurrentDeviceService currentDeviceService;
    @Mock RealtimeEventStore realtimeEventStore;
    @Mock CredentialRateLimiter credentialRateLimiter;
    @InjectMocks RealtimeSyncController controller;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void syncRatesTheAuthenticatedUserWithoutTouchingLazyDeviceOwner() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("alice", "n/a")
        );

        UserDevice device = mock(UserDevice.class);
        when(device.getDeviceId()).thenReturn("dev-1");
        lenient().when(device.getUser())
                .thenThrow(new LazyInitializationException("could not initialize proxy"));
        when(currentDeviceService.requireCurrentDevice()).thenReturn(device);
        when(realtimeEventStore.readAfter("dev-1", 0L, 200))
                .thenReturn(new RealtimeSyncResponse(List.of(), 0L, false));

        RealtimeSyncResponse response = controller.sync(0L, 200);

        assertThat(response.nextCursor()).isZero();
        verify(credentialRateLimiter).checkUserAction("alice", "sync");
    }
}
