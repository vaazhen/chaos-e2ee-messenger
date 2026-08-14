package ru.messenger.chaosmessenger.call.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.messenger.chaosmessenger.call.service.CallSignalingService;
import ru.messenger.chaosmessenger.infra.ws.WebSocketAuthChannelInterceptor;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CallControllerTest {

    @Mock CallSignalingService callSignalingService;
    @Mock WebSocketAuthChannelInterceptor authInterceptor;

    @InjectMocks CallController callController;

    @Test
    void relaysWhenSessionHasUsernameAndDevice() {
        CallSignalRequest request = new CallSignalRequest(100L, "offer", "v=0", null, null, null);
        when(authInterceptor.getUsernameBySessionId("session-1")).thenReturn("alice");
        when(authInterceptor.getDeviceIdBySessionId("session-1")).thenReturn("alice-phone");

        callController.call(request, "session-1");

        verify(callSignalingService).relay("alice", "alice-phone", request);
    }

    @Test
    void dropsWhenSessionHasNoUsername() {
        CallSignalRequest request = new CallSignalRequest(100L, "offer", "v=0", null, null, null);
        when(authInterceptor.getUsernameBySessionId("session-1")).thenReturn(null);

        callController.call(request, "session-1");

        verify(callSignalingService, never()).relay(any(), any(), any());
    }
}
