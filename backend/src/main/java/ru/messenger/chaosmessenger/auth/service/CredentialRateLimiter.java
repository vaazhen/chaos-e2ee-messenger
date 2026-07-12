package ru.messenger.chaosmessenger.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import ru.messenger.chaosmessenger.common.exception.RateLimitException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class CredentialRateLimiter {

    private static final int LIMIT = 10;
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private static final long INFRA_RETRY_AFTER_SECONDS = 60;

    private static final DefaultRedisScript<Long> INCREMENT_WITH_TTL = new DefaultRedisScript<>("""
            local current = redis.call('INCR', KEYS[1])
            if current == 1 then
                redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return current
            """, Long.class);

    private final RedisTemplate<String, String> redisTemplate;

    public void checkAndIncrement(String normalizedEmail) {
        String key = key(normalizedEmail);
        Long count;
        try {
            count = redisTemplate.execute(
                    INCREMENT_WITH_TTL,
                    List.of(key),
                    String.valueOf(WINDOW.toSeconds())
            );
        } catch (Exception e) {
            log.warn("Credential rate limiter unavailable: {}", e.getMessage());
            throw new RateLimitException(
                    "Authentication is temporarily unavailable. Please try again later.",
                    INFRA_RETRY_AFTER_SECONDS
            );
        }
        if (count == null) {
            throw new RateLimitException(
                    "Authentication is temporarily unavailable. Please try again later.",
                    INFRA_RETRY_AFTER_SECONDS
            );
        }
        if (count > LIMIT) {
            throw new RateLimitException("Too many login attempts. Try again in 15 minutes.", WINDOW.toSeconds());
        }
    }

    public void reset(String normalizedEmail) {
        try {
            redisTemplate.delete(key(normalizedEmail));
        } catch (Exception e) {
            log.warn("Unable to reset credential rate limit: {}", e.getMessage());
        }
    }

    private String key(String normalizedEmail) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(normalizedEmail.getBytes(StandardCharsets.UTF_8));
            return "auth:login:rate:" + Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
