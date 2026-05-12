package ru.messenger.chaosmessenger.push.dto;

public record PushSubscriptionRequest(
        String endpoint,
        String p256dh,
        String auth
) {}
