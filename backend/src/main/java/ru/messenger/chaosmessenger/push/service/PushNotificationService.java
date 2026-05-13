package ru.messenger.chaosmessenger.push.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.push.domain.PushSubscription;
import ru.messenger.chaosmessenger.push.repository.PushSubscriptionRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PushNotificationService {

    private final PushSubscriptionRepository subscriptionRepository;

    @Value("${chaos.push.vapid-public-key:}")
    private String vapidPublicKey;

    @Value("${chaos.push.vapid-private-key:}")
    private String vapidPrivateKey;

    @Transactional
    public void subscribe(Long userId, String deviceId, String endpoint, String p256dh, String authKey) {
        Optional<PushSubscription> existing = subscriptionRepository.findByUserIdAndDeviceId(userId, deviceId);

        PushSubscription subscription = existing.orElseGet(PushSubscription::new);
        subscription.setUserId(userId);
        subscription.setDeviceId(deviceId);
        subscription.setEndpoint(endpoint);
        subscription.setP256dh(p256dh);
        subscription.setAuthKey(authKey);
        if (subscription.getCreatedAt() == null) {
            subscription.setCreatedAt(LocalDateTime.now());
        }
        subscriptionRepository.save(subscription);
    }

    @Transactional
    public void unsubscribe(Long userId, String deviceId) {
        subscriptionRepository.deleteByUserIdAndDeviceId(userId, deviceId);
    }

    public String getVapidPublicKey() {
        return vapidPublicKey;
    }

    public void sendPushToUser(Long userId, String title, String body) {
        List<PushSubscription> subscriptions = subscriptionRepository.findByUserId(userId);
        for (PushSubscription sub : subscriptions) {
            // TODO: implement RFC 8291 Web Push encryption with VAPID
            log.info("Would send push to {} — title: {}, body: {}", sub.getEndpoint(), title, body);
        }
    }
}
