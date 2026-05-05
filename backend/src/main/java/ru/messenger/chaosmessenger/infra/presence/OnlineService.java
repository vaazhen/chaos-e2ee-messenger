package ru.messenger.chaosmessenger.infra.presence;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class OnlineService {

    private static final Duration PRESENCE_TTL = Duration.ofSeconds(60);

    private final org.springframework.data.redis.core.RedisTemplate<String, String> redisTemplate;

    public OnlineService(org.springframework.data.redis.core.RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void setOnline(String username) {
        String key = presenceKey(username);
        redisTemplate.opsForValue().set(key, "1", PRESENCE_TTL);
        redisTemplate.opsForValue().set(lastSeenKey(username), LocalDateTime.now().toString());
    }

    public void setOffline(String username) {
        redisTemplate.delete(presenceKey(username));
        redisTemplate.delete(sessionsKey(username));
        redisTemplate.opsForValue().set(lastSeenKey(username), LocalDateTime.now().toString());
    }

    public boolean markSessionOnline(String username, String sessionId) {
        if (username == null || username.isBlank() || sessionId == null || sessionId.isBlank()) {
            return false;
        }

        boolean wasOnline = isOnline(username);
        redisTemplate.opsForSet().add(sessionsKey(username), sessionId);
        redisTemplate.expire(sessionsKey(username), PRESENCE_TTL);
        setOnline(username);
        return !wasOnline;
    }

    public boolean markSessionOffline(String username, String sessionId) {
        if (username == null || username.isBlank() || sessionId == null || sessionId.isBlank()) {
            return false;
        }

        redisTemplate.opsForSet().remove(sessionsKey(username), sessionId);
        Long activeSessions = redisTemplate.opsForSet().size(sessionsKey(username));
        if (activeSessions != null && activeSessions > 0) {
            redisTemplate.expire(sessionsKey(username), PRESENCE_TTL);
            setOnline(username);
            return false;
        }

        setOffline(username);
        return true;
    }

    public void refreshSession(String username, String sessionId) {
        if (username == null || username.isBlank() || sessionId == null || sessionId.isBlank()) {
            return;
        }

        redisTemplate.opsForSet().add(sessionsKey(username), sessionId);
        redisTemplate.expire(sessionsKey(username), PRESENCE_TTL);
        setOnline(username);
    }

    public boolean isOnline(String username) {
        Boolean has = redisTemplate.hasKey(presenceKey(username));
        return Boolean.TRUE.equals(has);
    }

    public LocalDateTime getLastSeen(String username) {
        String s = redisTemplate.opsForValue().get(lastSeenKey(username));
        if (s == null) return LocalDateTime.now().minusDays(1);
        try {
            return LocalDateTime.parse(s);
        } catch (Exception ex) {
            return LocalDateTime.now().minusDays(1);
        }
    }

    private String presenceKey(String username) {
        return "presence:" + username;
    }

    private String sessionsKey(String username) {
        return "presence:sessions:" + username;
    }

    private String lastSeenKey(String username) {
        return "lastseen:" + username;
    }
}
