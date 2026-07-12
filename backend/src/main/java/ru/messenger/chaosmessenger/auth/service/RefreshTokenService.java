package ru.messenger.chaosmessenger.auth.service;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;

/**
 * Issues, rotates, and revokes refresh-token families.
 *
 * <p>Only a SHA-256 digest of a refresh token is stored in Redis. Every successful
 * refresh rotates the token. Reuse of an already consumed token revokes the whole
 * family, limiting damage from token theft.</p>
 */
@Service
public class RefreshTokenService {

    static final Duration REFRESH_TTL = Duration.ofDays(30);
    private static final String ACTIVE_PREFIX = "refresh:active:";
    private static final String USED_PREFIX = "refresh:used:";
    private static final String REVOKED_FAMILY_PREFIX = "refresh:family:revoked:";
    private static final String VALUE_VERSION = "v1";

    private final RedisTemplate<String, String> redisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public IssuedToken issueSession(String username) {
        return issueForFamily(username, UUID.randomUUID().toString());
    }

    /** Compatibility helper for callers that only need the opaque token. */
    public String issue(String username) {
        return issueSession(username).token();
    }

    public Rotation rotate(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }

        String digest = digest(token);
        String usedFamily = redisTemplate.opsForValue().get(USED_PREFIX + digest);
        if (usedFamily != null) {
            revokeFamily(usedFamily);
            return null;
        }

        String encoded = redisTemplate.opsForValue().getAndDelete(ACTIVE_PREFIX + digest);
        TokenRecord record = decode(encoded);
        if (record == null || isFamilyRevoked(record.familyId())) {
            return null;
        }

        redisTemplate.opsForValue().set(USED_PREFIX + digest, record.familyId(), REFRESH_TTL);
        IssuedToken replacement = issueForFamily(record.username(), record.familyId());
        return new Rotation(record.username(), replacement.token(), record.familyId());
    }

    /**
     * Atomically consumes a token without creating a replacement.
     * Prefer {@link #rotate(String)} for normal refresh flows.
     */
    public String consumeAndGetUsername(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        String digest = digest(token);
        String encoded = redisTemplate.opsForValue().getAndDelete(ACTIVE_PREFIX + digest);
        TokenRecord record = decode(encoded);
        if (record == null || isFamilyRevoked(record.familyId())) {
            return null;
        }
        redisTemplate.opsForValue().set(USED_PREFIX + digest, record.familyId(), REFRESH_TTL);
        return record.username();
    }

    /** Revokes the entire refresh-token family represented by {@code token}. */
    public void revoke(String token) {
        if (token == null || token.isBlank()) {
            return;
        }

        String digest = digest(token);
        String encoded = redisTemplate.opsForValue().getAndDelete(ACTIVE_PREFIX + digest);
        TokenRecord record = decode(encoded);
        if (record != null) {
            revokeFamily(record.familyId());
            return;
        }

        String usedFamily = redisTemplate.opsForValue().get(USED_PREFIX + digest);
        if (usedFamily != null) {
            revokeFamily(usedFamily);
        }
    }

    private IssuedToken issueForFamily(String username, String familyId) {
        String token = randomToken();
        String digest = digest(token);
        redisTemplate.opsForValue().set(
                ACTIVE_PREFIX + digest,
                encode(new TokenRecord(username, familyId)),
                REFRESH_TTL
        );
        return new IssuedToken(token, familyId);
    }

    private void revokeFamily(String familyId) {
        redisTemplate.opsForValue().set(REVOKED_FAMILY_PREFIX + familyId, "1", REFRESH_TTL);
    }

    private boolean isFamilyRevoked(String familyId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(REVOKED_FAMILY_PREFIX + familyId));
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String digest(String token) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    private String encode(TokenRecord record) {
        return VALUE_VERSION + "|" + record.username() + "|" + record.familyId();
    }

    private TokenRecord decode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String[] parts = value.split("\\|", 3);
        if (parts.length != 3 || !VALUE_VERSION.equals(parts[0])) {
            return null;
        }
        return new TokenRecord(parts[1], parts[2]);
    }

    private record TokenRecord(String username, String familyId) {
    }

    public record IssuedToken(String token, String sessionId) {
    }

    public record Rotation(String username, String token, String sessionId) {
    }
}
