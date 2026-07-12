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
public class SmsRateLimiter {

    private static final int SHORT_LIMIT = 3;
    private static final int SHORT_WINDOW_MINUTES = 10;
    private static final int DAY_LIMIT = 10;
    private static final long INFRA_RETRY_AFTER_SECONDS = 60;

    private static final DefaultRedisScript<Long> INCREMENT_WITH_TTL_SCRIPT = new DefaultRedisScript<>("""
            local current = redis.call('INCR', KEYS[1])
            if current == 1 then
                redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return current
            """, Long.class);

    private final RedisTemplate<String, String> redisTemplate;

    public void checkAndIncrement(String phone) {
        String phoneHash = hash(phone);
        checkLimit(
                "sms:rate:short:" + phoneHash,
                SHORT_LIMIT,
                Duration.ofMinutes(SHORT_WINDOW_MINUTES),
                "Too many SMS codes. Please wait " + SHORT_WINDOW_MINUTES + " minutes.",
                (long) SHORT_WINDOW_MINUTES * 60
        );
        checkLimit(
                "sms:rate:day:" + phoneHash,
                DAY_LIMIT,
                Duration.ofHours(24),
                "Daily SMS code limit exceeded. Try again tomorrow.",
                24 * 60 * 60L
        );
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    private void checkLimit(String key, int limit, Duration ttl, String message, long retryAfterSeconds) {
        Long count;
        try {
            count = redisTemplate.execute(INCREMENT_WITH_TTL_SCRIPT, List.of(key), String.valueOf(ttl.toSeconds()));
        } catch (Exception e) {
            log.warn("Redis unavailable during SMS rate-limit check: {}", e.getMessage());
            throw new RateLimitException("SMS rate limiter is temporarily unavailable. Please try again later.",
                    INFRA_RETRY_AFTER_SECONDS);
        }
        if (count == null) {
            log.warn("Redis returned null during SMS rate-limit check");
            throw new RateLimitException("SMS rate limiter is temporarily unavailable. Please try again later.",
                    INFRA_RETRY_AFTER_SECONDS);
        }
        if (count > limit) {
            log.warn("SMS rate limit exceeded: count={}, limit={}", count, limit);
            throw new RateLimitException(message, retryAfterSeconds);
        }
    }
}
