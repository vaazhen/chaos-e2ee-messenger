package ru.messenger.chaosmessenger.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import ru.messenger.chaosmessenger.auth.service.RefreshTokenService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RefreshTokenServiceTest {

    private RedisTemplate<String, String> redisTemplate;
    private ValueOperations<String, String> valueOps;
    private RefreshTokenService service;

    @BeforeEach
    void setup() {
        redisTemplate = mock(RedisTemplate.class);
        valueOps = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        service = new RefreshTokenService(redisTemplate);
    }

    @Test
    void issueSessionStoresOnlyDigestWithThirtyDayTtl() {
        RefreshTokenService.IssuedToken issued = service.issueSession("alice");

        assertThat(issued.token()).isNotBlank().doesNotContain("alice");
        assertThat(issued.sessionId()).isNotBlank();

        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> value = ArgumentCaptor.forClass(String.class);
        verify(valueOps).set(key.capture(), value.capture(), eq(Duration.ofDays(30)));

        assertThat(key.getValue()).isEqualTo("refresh:active:" + digest(issued.token()));
        assertThat(key.getValue()).doesNotContain(issued.token());
        assertThat(value.getValue()).isEqualTo("v1|alice|" + issued.sessionId());
        assertThat(value.getValue()).doesNotContain(issued.token());
    }

    @Test
    void rotateConsumesOldTokenAndIssuesReplacementInSameFamily() {
        RefreshTokenService.IssuedToken issued = service.issueSession("alice");
        String activeKey = "refresh:active:" + digest(issued.token());
        String encoded = "v1|alice|" + issued.sessionId();

        reset(valueOps, redisTemplate);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("refresh:used:" + digest(issued.token()))).thenReturn(null);
        when(valueOps.getAndDelete(activeKey)).thenReturn(encoded);
        when(redisTemplate.hasKey("refresh:family:revoked:" + issued.sessionId())).thenReturn(false);

        RefreshTokenService.Rotation rotation = service.rotate(issued.token());

        assertThat(rotation).isNotNull();
        assertThat(rotation.username()).isEqualTo("alice");
        assertThat(rotation.sessionId()).isEqualTo(issued.sessionId());
        assertThat(rotation.token()).isNotEqualTo(issued.token());
        verify(valueOps).set(
                "refresh:used:" + digest(issued.token()),
                issued.sessionId(),
                Duration.ofDays(30)
        );
        verify(valueOps).set(
                eq("refresh:active:" + digest(rotation.token())),
                eq("v1|alice|" + issued.sessionId()),
                eq(Duration.ofDays(30))
        );
    }

    @Test
    void reuseOfConsumedTokenRevokesWholeFamily() {
        String token = "stolen-consumed-token";
        String family = "family-1";
        when(valueOps.get("refresh:used:" + digest(token))).thenReturn(family);

        assertThat(service.rotate(token)).isNull();

        verify(valueOps).set("refresh:family:revoked:" + family, "1", Duration.ofDays(30));
        verify(valueOps, never()).getAndDelete(anyString());
    }

    @Test
    void consumeAndGetUsernameRejectsRevokedFamily() {
        String token = "active-token";
        String family = "family-2";
        when(valueOps.getAndDelete("refresh:active:" + digest(token)))
                .thenReturn("v1|alice|" + family);
        when(redisTemplate.hasKey("refresh:family:revoked:" + family)).thenReturn(true);

        assertThat(service.consumeAndGetUsername(token)).isNull();
    }

    @Test
    void revokeMarksActiveTokenFamilyAsRevoked() {
        String token = "active-token";
        String family = "family-3";
        when(valueOps.getAndDelete("refresh:active:" + digest(token)))
                .thenReturn("v1|alice|" + family);

        service.revoke(token);

        verify(valueOps).set("refresh:family:revoked:" + family, "1", Duration.ofDays(30));
    }

    @Test
    void revokeDoesNothingForNull() {
        service.revoke(null);
        verifyNoInteractions(redisTemplate);
    }

    private static String digest(String token) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            throw new AssertionError(e);
        }
    }
}
