package ru.messenger.chaosmessenger.infra.presence;

public record UserStatusEvent(
        String username,
        String status,
        long timestamp
) {}
