package ru.messenger.chaosmessenger.outbox;

import java.util.Locale;
import java.util.Set;
import java.util.UUID;

public final class OutboxIds {

    private static final int MAX_KEY_LENGTH = 150;
    private static final Set<String> ONE_SHOT_CHAT_REASONS = Set.of(
            "CHAT_CREATED",
            "SAVED_CHAT_CREATED",
            "REQUEST_CREATED",
            "REQUEST_ACCEPTED",
            "REQUEST_DECLINED",
            "GROUP_ARCHIVED",
            "CHAT_DELETED_FOR_EVERYONE"
    );

    private OutboxIds() {
    }

    public static String key(Object... parts) {
        StringBuilder builder = new StringBuilder();
        for (Object part : parts) {
            if (builder.length() > 0) {
                builder.append(':');
            }
            builder.append(part == null ? "" : part);
        }
        String value = builder.toString();
        return value.length() <= MAX_KEY_LENGTH ? value : value.substring(0, MAX_KEY_LENGTH);
    }

    public static String chatKey(Long chatId, String reason) {
        return eventKey("chat", chatId, reason);
    }

    public static String eventKey(String aggregate, Long chatId, String reason) {
        String normalized = reason == null ? "CHAT" : reason.toUpperCase(Locale.ROOT);
        String prefix = aggregate == null || aggregate.isBlank()
                ? "chat"
                : aggregate.toLowerCase(Locale.ROOT);
        if (ONE_SHOT_CHAT_REASONS.contains(normalized)) {
            return key(prefix, chatId, normalized);
        }
        return key(prefix, chatId, normalized, UUID.randomUUID());
    }
}
