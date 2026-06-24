package ru.messenger.chaosmessenger.chat.domain;

/**
 * Role of a participant inside a GROUP chat. Hierarchy (highest to lowest):
 * {@code OWNER} > {@code ADMIN} > {@code MODERATOR} > {@code MEMBER}.
 *
 * <p>Direct chats ignore this — both participants are functionally equal.
 */
public enum GroupRole {
    OWNER,
    ADMIN,
    MODERATOR,
    MEMBER;

    /** Higher rank means more permissions. */
    public int rank() {
        return switch (this) {
            case OWNER -> 3;
            case ADMIN -> 2;
            case MODERATOR -> 1;
            case MEMBER -> 0;
        };
    }

    /** {@code true} if this role is at least as powerful as {@code other}. */
    public boolean atLeast(GroupRole other) {
        return rank() >= other.rank();
    }

    public static GroupRole fromString(String raw) {
        if (raw == null || raw.isBlank()) {
            return MEMBER;
        }
        try {
            return GroupRole.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return MEMBER;
        }
    }
}
