package ru.messenger.chaosmessenger.auth;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import ru.messenger.chaosmessenger.auth.service.CredentialRateLimiter;
import ru.messenger.chaosmessenger.common.exception.RateLimitException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CredentialRateLimiterTest {

    @Test
    void blocksAfterConfiguredWindowLimitWithoutPuttingEmailInRedisKey() {
        RedisTemplate<String, String> redis = mock(RedisTemplate.class);
        when(redis.execute(any(), anyList(), anyString())).thenReturn(11L);
        CredentialRateLimiter limiter = new CredentialRateLimiter(redis);

        assertThatThrownBy(() -> limiter.checkAndIncrement("alice@example.com"))
                .isInstanceOf(RateLimitException.class)
                .hasMessageContaining("Too many login attempts");
    }

    @Test
    void resetDeletesOnlyHashedRateKey() {
        RedisTemplate<String, String> redis = mock(RedisTemplate.class);
        CredentialRateLimiter limiter = new CredentialRateLimiter(redis);

        limiter.reset("alice@example.com");

        verify(redis).delete(org.mockito.ArgumentMatchers.<String>argThat(
                key -> key.startsWith("auth:login:rate:") && !key.contains("alice@example.com")
        ));
    }
}
