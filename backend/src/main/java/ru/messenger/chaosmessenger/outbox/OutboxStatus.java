package ru.messenger.chaosmessenger.outbox;

public enum OutboxStatus {
    PENDING,
    PROCESSING,
    PUBLISHED,
    FAILED,
    DEAD
}
