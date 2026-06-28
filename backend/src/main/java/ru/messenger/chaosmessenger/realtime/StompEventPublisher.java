package ru.messenger.chaosmessenger.realtime;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StompEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;
    private final WebSocketSessionRegistry sessionRegistry;
    private final MeterRegistry meterRegistry;

    public void publishToDevice(String deviceId, String suffix, Object payload) {
        if (!sessionRegistry.hasDeviceSession(deviceId)) {
            return;
        }
        messagingTemplate.convertAndSend("/topic/devices/" + deviceId + suffix, payload);
        increment("chaos_ws_events_delivered_total");
    }

    public void publishToUser(String username, String suffix, Object payload) {
        if (!sessionRegistry.hasUserSession(username)) {
            return;
        }
        messagingTemplate.convertAndSend("/topic/users/" + username + suffix, payload);
        increment("chaos_ws_events_delivered_total");
    }

    public void publishGlobal(String destination, Object payload) {
        messagingTemplate.convertAndSend(destination, payload);
        increment("chaos_ws_events_delivered_total");
    }

    private void increment(String metric) {
        try {
            meterRegistry.counter(metric).increment();
        } catch (Exception ignored) {
        }
    }
}
