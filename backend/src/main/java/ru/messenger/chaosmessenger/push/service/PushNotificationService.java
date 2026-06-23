package ru.messenger.chaosmessenger.push.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.push.domain.PushSubscription;
import ru.messenger.chaosmessenger.push.repository.PushSubscriptionRepository;

import java.security.Security;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PushNotificationService {

    static {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    private final PushSubscriptionRepository subscriptionRepository;

    @Value("${chaos.push.vapid-public-key:}")
    private String vapidPublicKey;

    @Value("${chaos.push.vapid-private-key:}")
    private String vapidPrivateKey;

    @Value("${chaos.push.vapid-subject:mailto:admin@chaos-messenger.local}")
    private String vapidSubject;

    private PushService pushService;

    private PushService getPushService() {
        if (pushService == null && !vapidPublicKey.isBlank() && !vapidPrivateKey.isBlank()) {
            try {
                pushService = new PushService()
                        .setPublicKey(vapidPublicKey)
                        .setPrivateKey(vapidPrivateKey)
                        .setSubject(vapidSubject);
            } catch (Exception e) {
                log.error("Failed to initialize PushService: {}", e.getMessage());
            }
        }
        return pushService;
    }

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
        PushService ps = getPushService();

        for (PushSubscription sub : subscriptions) {
            try {
                if (ps != null) {
                    String payload = "{\"title\":\"" + escapeJson(title) + "\",\"body\":\"" + escapeJson(body) + "\"}";
                    Notification notification = new Notification(
                            sub.getEndpoint(),
                            sub.getP256dh(),
                            sub.getAuthKey(),
                            payload.getBytes()
                    );
                    ps.send(notification);
                    log.debug("Push sent to device {}", sub.getDeviceId());
                } else {
                    log.info("Would send push to {} — title: {}, body: {}", sub.getEndpoint(), title, body);
                }
            } catch (Exception e) {
                log.warn("Failed to send push to device {}: {}", sub.getDeviceId(), e.getMessage());
            }
        }
    }

    public void sendPushToUser(Long userId, String title, String body, String tag, String chatId) {
        List<PushSubscription> subscriptions = subscriptionRepository.findByUserId(userId);
        PushService ps = getPushService();

        for (PushSubscription sub : subscriptions) {
            try {
                if (ps != null) {
                    String payload = String.format(
                            "{\"title\":\"%s\",\"body\":\"%s\",\"tag\":\"%s\",\"data\":{\"chatId\":\"%s\"}}",
                            escapeJson(title), escapeJson(body), escapeJson(tag), escapeJson(chatId)
                    );
                    Notification notification = new Notification(
                            sub.getEndpoint(),
                            sub.getP256dh(),
                            sub.getAuthKey(),
                            payload.getBytes()
                    );
                    ps.send(notification);
                } else {
                    log.info("Would send push to {} — title: {}, body: {}, tag: {}", sub.getEndpoint(), title, body, tag);
                }
            } catch (Exception e) {
                log.warn("Failed to send push to device {}: {}", sub.getDeviceId(), e.getMessage());
            }
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
