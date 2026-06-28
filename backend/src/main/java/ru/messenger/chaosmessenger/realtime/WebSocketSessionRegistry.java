package ru.messenger.chaosmessenger.realtime;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketSessionRegistry {

    private final ConcurrentHashMap<String, SessionInfo> bySessionId = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<String>> sessionsByUsername = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<String>> sessionsByDeviceId = new ConcurrentHashMap<>();

    public void register(String sessionId, String username, String deviceId) {
        if (sessionId == null || username == null || deviceId == null) {
            return;
        }
        unregister(sessionId);
        bySessionId.put(sessionId, new SessionInfo(sessionId, username, deviceId, Instant.now()));
        sessionsByUsername.computeIfAbsent(username, key -> ConcurrentHashMap.newKeySet()).add(sessionId);
        sessionsByDeviceId.computeIfAbsent(deviceId, key -> ConcurrentHashMap.newKeySet()).add(sessionId);
    }

    public void unregister(String sessionId) {
        if (sessionId == null) {
            return;
        }
        SessionInfo previous = bySessionId.remove(sessionId);
        if (previous == null) {
            return;
        }
        removeFromIndex(sessionsByUsername, previous.username(), sessionId);
        removeFromIndex(sessionsByDeviceId, previous.deviceId(), sessionId);
    }

    public String username(String sessionId) {
        SessionInfo info = bySessionId.get(sessionId);
        return info == null ? null : info.username();
    }

    public String deviceId(String sessionId) {
        SessionInfo info = bySessionId.get(sessionId);
        return info == null ? null : info.deviceId();
    }

    public boolean hasUserSession(String username) {
        Set<String> sessions = sessionsByUsername.get(username);
        return sessions != null && !sessions.isEmpty();
    }

    public boolean hasDeviceSession(String deviceId) {
        Set<String> sessions = sessionsByDeviceId.get(deviceId);
        return sessions != null && !sessions.isEmpty();
    }

    public int activeSessions() {
        return bySessionId.size();
    }

    private void removeFromIndex(ConcurrentHashMap<String, Set<String>> index, String key, String sessionId) {
        Set<String> sessions = index.get(key);
        if (sessions == null) {
            return;
        }
        sessions.remove(sessionId);
        if (sessions.isEmpty()) {
            index.remove(key, sessions);
        }
    }

    public record SessionInfo(String sessionId, String username, String deviceId, Instant connectedAt) {
    }
}
