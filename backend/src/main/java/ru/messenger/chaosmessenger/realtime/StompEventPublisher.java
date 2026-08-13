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
    private final RedisWsFanout redisWsFanout;
    private final MeterRegistry meterRegistry;

    public void publishToDevice(String deviceId, String suffix, Object payload) {
        deliverLocalToDevice(deviceId, suffix, payload);
        redisWsFanout.publishDevice(deviceId, suffix, payload);
    }

    public void publishToUser(String username, String suffix, Object payload) {
        deliverLocalToUser(username, suffix, payload);
        redisWsFanout.publishUser(username, suffix, payload);
    }

    public void publishGlobal(String destination, Object payload) {
        deliverLocalGlobal(destination, payload);
        redisWsFanout.publishGlobal(destination, payload);
    }

    void deliverLocalToDevice(String deviceId, String suffix, Object payload) {
        if (deviceId == null || !sessionRegistry.hasDeviceSession(deviceId)) {
            return;
        }
        messagingTemplate.convertAndSend("/topic/devices/" + deviceId + suffix, payload);
        increment("chaos_ws_events_delivered_total");
    }

    void deliverLocalToUser(String username, String suffix, Object payload) {
        if (username == null || !sessionRegistry.hasUserSession(username)) {
            return;
        }
        messagingTemplate.convertAndSend("/topic/users/" + username + suffix, payload);
        increment("chaos_ws_events_delivered_total");
    }

    void deliverLocalGlobal(String destination, Object payload) {
        if (destination == null || destination.isBlank()) {
            return;
        }
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
