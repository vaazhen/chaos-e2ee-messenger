package ru.messenger.chaosmessenger.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import ru.messenger.chaosmessenger.auth.service.SetupTokenService;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SetupTokenServiceTest {

    private RedisTemplate<String, String> redisTemplate;
    private ValueOperations<String, String> valueOps;
    private SetupTokenService service;

    @BeforeEach
    void setUp() {
        redisTemplate = Mockito.mock(RedisTemplate.class);
        valueOps = Mockito.mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        service = new SetupTokenService(redisTemplate);
    }

    @Test
    void issueStoresPhoneWithShortTtl() {
        String token = service.issue("+79001234567");

        assertThat(token).isNotBlank();
        verify(valueOps).set(contains(token), eq("+79001234567"), eq(Duration.ofMinutes(10)));
    }

    @Test
    void getPhoneReadsWithoutConsumingToken() {
        when(valueOps.get("setup:token:setup-token")).thenReturn("+79001234567");

        String phone = service.getPhone("setup-token");

        assertThat(phone).isEqualTo("+79001234567");
        verify(valueOps).get("setup:token:setup-token");
        verify(valueOps, never()).getAndDelete("setup:token:setup-token");
    }

    @Test
    void consumePhoneDeletesTokenAtomically() {
        when(valueOps.getAndDelete("setup:token:setup-token")).thenReturn("+79001234567");

        String phone = service.consumePhone("setup-token");

        assertThat(phone).isEqualTo("+79001234567");
        verify(valueOps).getAndDelete("setup:token:setup-token");
    }
}
