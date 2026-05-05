package ru.messenger.chaosmessenger.message.dto;

public record TypingEvent(
        String username,
        boolean typing
) {}
