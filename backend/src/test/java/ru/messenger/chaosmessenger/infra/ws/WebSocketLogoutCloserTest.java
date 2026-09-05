package ru.messenger.chaosmessenger.infra.ws;

import org.junit.jupiter.api.Test;
import ru.messenger.chaosmessenger.realtime.WebSocketSessionRegistry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class WebSocketLogoutCloserTest {

    @Test
    void closesAndUnregistersEverySessionForTheUser() {
        WebSocketSessionRegistry registry = new WebSocketSessionRegistry();
        registry.register("s1", "alice", "dev-a", "family-1");
        registry.register("s2", "alice", "dev-b", "family-1");
        registry.register("s3", "bob", "dev-c", "family-2");
        WebSocketNativeSessionTracker tracker = mock(WebSocketNativeSessionTracker.class);
        WebSocketLogoutCloser closer = new WebSocketLogoutCloser(registry, tracker);

        closer.closeSessionsForUsername("alice");

        verify(tracker).close("s1");
        verify(tracker).close("s2");
        assertThat(registry.sessionIdsForUsername("alice")).isEmpty();
        assertThat(registry.sessionIdsForUsername("bob")).containsExactly("s3");
    }

    @Test
    void closesOnlyTheRevokedDevice() {
        WebSocketSessionRegistry registry = new WebSocketSessionRegistry();
        registry.register("s1", "alice", "dev-a", "family-1");
        registry.register("s2", "alice", "dev-b", "family-1");
        WebSocketNativeSessionTracker tracker = mock(WebSocketNativeSessionTracker.class);
        WebSocketLogoutCloser closer = new WebSocketLogoutCloser(registry, tracker);

        closer.closeSessionsForDevice("dev-a");

        verify(tracker).close("s1");
        assertThat(registry.sessionIdsForDevice("dev-a")).isEmpty();
        assertThat(registry.sessionIdsForUsername("alice")).containsExactly("s2");
    }
}
