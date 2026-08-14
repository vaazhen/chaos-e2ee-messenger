package ru.messenger.chaosmessenger.auth.service;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

/**
 * Issues and validates short-lived device-registration tokens.
 *
 * <p>Flow:
 * <ol>
 *   <li>Login ({@code /api/auth/verify-code}, {@code /api/auth/complete-setup},
 *       email login/register) returns a one-time {@code deviceRegistrationToken}
 *       (UUID, TTL 60 s, Redis {@code dev_reg_token:<uuid>} → username).</li>
 *   <li>{@code POST /api/crypto/devices/register} consumes the token from
 *       {@code X-Device-Registration-Token} and enrolls a <em>new</em> device.</li>
 * </ol>
 *
 * <p>Refresh must not mint this token: a stolen refresh cookie would otherwise
 * enroll a hostile identity onto an existing device id. JWT re-bind of an
 * already enrolled device is allowed only when identity keys match.
 */
@Service
public class DeviceRegistrationTokenService {

    private static final Duration TTL    = Duration.ofSeconds(60);
    private static final String   PREFIX = "dev_reg_token:";

    private final RedisTemplate<String, String> redisTemplate;

    public DeviceRegistrationTokenService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /** Generate a one-time token bound to {@code username}. */
    public String issue(String username) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(PREFIX + token, username, TTL);
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
