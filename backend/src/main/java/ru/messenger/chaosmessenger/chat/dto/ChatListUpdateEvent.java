package ru.messenger.chaosmessenger.chat.dto;

public record ChatListUpdateEvent(
        Long chatId,
        String reason,
        Long updatedUserId,
        long timestamp
) {
    public static ChatListUpdateEvent forChat(Long chatId, String reason) {
        return new ChatListUpdateEvent(chatId, reason, null, System.currentTimeMillis());
    }

    public static ChatListUpdateEvent profileUpdated(Long updatedUserId) {
        return new ChatListUpdateEvent(null, "profile_updated", updatedUserId, System.currentTimeMillis());
    }
}
