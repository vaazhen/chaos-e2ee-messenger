package ru.messenger.chaosmessenger.push.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "push_subscriptions")
@Getter
@Setter
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "device_id", nullable = false, length = 100)
    private String deviceId;

    @Column(name = "endpoint", nullable = false, columnDefinition = "text")
    private String endpoint;

    @Column(name = "p256dh", nullable = false, columnDefinition = "text")
    private String p256dh;

    @Column(name = "auth_key", nullable = false, columnDefinition = "text")
    private String authKey;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
