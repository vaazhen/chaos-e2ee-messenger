package ru.messenger.chaosmessenger.auth.service;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Issues and validates short-lived device-registration tokens.
 *
 * <p>Flow:
 * <ol>
 *   <li>Strong auth (password/OTP) → marks {@code last_strong_auth:<username>}
 *       in Redis with a 5-minute TTL.</li>
 *   <li>{@code /api/auth/verify-code} or login succeeds → returns a
 *       {@code deviceRegistrationToken} <b>only</b> if strong auth was recent.</li>
 *   <li>{@code POST /api/crypto/devices/register} reads the token from the
 *       {@code X-Device-Registration-Token} header, validates it, and consumes it.</li>
 * </ol>
 *
 * <p>A stolen refresh token alone cannot add a new E2EE device — the attacker
 * must also have recently authenticated with password or OTP.
 */
@Service
public class DeviceRegistrationTokenService {

    private static final Duration TOKEN_TTL = Duration.ofSeconds(60);
    private static final Duration STRONG_AUTH_TTL = Duration.ofMinutes(5);
    private static final String PREFIX = "dev_reg_token:";
    private static final String STRONG_AUTH_PREFIX = "last_strong_auth:";

    private final RedisTemplate<String, String> redisTemplate;

    public DeviceRegistrationTokenService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /** Record that username has recently performed strong auth. Returns a one-time challenge token. */
    public String markStrongAuth(String username) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("username is required");
        }
        String challenge = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(
                STRONG_AUTH_PREFIX + username,
                challenge,
                STRONG_AUTH_TTL
        );
        return challenge;
    }

    /**
     * Generate a one-time device registration token bound to a specific strong-auth challenge.
     *
     * @param challengeToken the token returned by {@link #markStrongAuth(String)}
     * @throws IllegalStateException if strong auth has expired or challenge is wrong
     */
    public String issue(String username, String challengeToken) {
        if (challengeToken == null || challengeToken.isBlank()) {
            throw new IllegalStateException("Device registration requires recent authentication");
        }
        String stored = redisTemplate.opsForValue().get(STRONG_AUTH_PREFIX + username);
        if (stored == null || !stored.equals(challengeToken)) {
            throw new IllegalStateException(
                    "Device registration requires recent password or OTP authentication. Please re-authenticate."
            );
        }
        // One-time consumption
        redisTemplate.delete(STRONG_AUTH_PREFIX + username);
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(PREFIX + token, username, TOKEN_TTL);
        return token;
    }

    /**
     * Validate and atomically consume the token.
     *
     * @return the username the token was issued for, or {@code null} if the
     *         token is unknown / already used / expired.
     */
    public String consumeAndGetUsername(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        return redisTemplate.opsForValue().getAndDelete(PREFIX + token);
    }
}
