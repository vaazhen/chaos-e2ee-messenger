package ru.messenger.chaosmessenger.push;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.messenger.chaosmessenger.push.domain.PushSubscription;
import ru.messenger.chaosmessenger.push.repository.PushSubscriptionRepository;
import ru.messenger.chaosmessenger.push.service.PushNotificationService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PushNotificationServiceTest {

    @Mock
    private PushSubscriptionRepository subscriptionRepository;

    private PushNotificationService pushService;

    @BeforeEach
    void setUp() {
        pushService = new PushNotificationService(subscriptionRepository);
        ReflectionTestUtils.setField(pushService, "vapidPublicKey", "");
        ReflectionTestUtils.setField(pushService, "vapidPrivateKey", "");
    }

    @Test
    void subscribe_createsNewSubscription() {
        when(subscriptionRepository.findByUserIdAndDeviceId(1L, "device-1"))
                .thenReturn(Optional.empty());

        pushService.subscribe(1L, "device-1", "https://endpoint.com", "p256dh-key", "auth-key");

        verify(subscriptionRepository).save(argThat(sub ->
                sub.getUserId() == 1L &&
                sub.getDeviceId().equals("device-1") &&
                sub.getEndpoint().equals("https://endpoint.com") &&
                sub.getP256dh().equals("p256dh-key") &&
                sub.getAuthKey().equals("auth-key") &&
                sub.getCreatedAt() != null
        ));
    }

    @Test
    void subscribe_updatesExistingSubscription() {
        PushSubscription existing = new PushSubscription();
        existing.setUserId(1L);
        existing.setDeviceId("device-1");
        existing.setEndpoint("old-endpoint");
        existing.setCreatedAt(LocalDateTime.now().minusDays(1));

        when(subscriptionRepository.findByUserIdAndDeviceId(1L, "device-1"))
                .thenReturn(Optional.of(existing));

        pushService.subscribe(1L, "device-1", "new-endpoint", "new-p256dh", "new-auth");

        verify(subscriptionRepository).save(argThat(sub ->
                sub.getEndpoint().equals("new-endpoint") &&
                sub.getP256dh().equals("new-p256dh")
        ));
    }

    @Test
    void unsubscribe_deletesSubscription() {
        pushService.unsubscribe(1L, "device-1");
        verify(subscriptionRepository).deleteByUserIdAndDeviceId(1L, "device-1");
    }

    @Test
    void getVapidPublicKey_returnsConfiguredKey() {
        ReflectionTestUtils.setField(pushService, "vapidPublicKey", "test-public-key");
        assertEquals("test-public-key", pushService.getVapidPublicKey());
    }

    @Test
    void sendPushToUser_doesNotThrowWhenNoSubscriptions() {
        when(subscriptionRepository.findByUserId(1L)).thenReturn(List.of());
        assertDoesNotThrow(() -> pushService.sendPushToUser(1L, "title", "body"));
    }

    @Test
    void sendPushToUser_processesAllSubscriptions() {
        PushSubscription sub1 = new PushSubscription();
        sub1.setEndpoint("https://endpoint1.com");
        sub1.setP256dh("key1");
        sub1.setAuthKey("auth1");

        PushSubscription sub2 = new PushSubscription();
        sub2.setEndpoint("https://endpoint2.com");
        sub2.setP256dh("key2");
        sub2.setAuthKey("auth2");

        when(subscriptionRepository.findByUserId(1L)).thenReturn(List.of(sub1, sub2));

        assertDoesNotThrow(() -> pushService.sendPushToUser(1L, "New message", "Body"));
    }

    @Test
    void sendPushToUser_withTagAndChatId_doesNotThrow() {
        PushSubscription sub = new PushSubscription();
        sub.setEndpoint("https://endpoint.com");
        sub.setP256dh("key");
        sub.setAuthKey("auth");

        when(subscriptionRepository.findByUserId(1L)).thenReturn(List.of(sub));

        assertDoesNotThrow(() ->
                pushService.sendPushToUser(1L, "Title", "Body", "tag-1", "42"));
    }
}
