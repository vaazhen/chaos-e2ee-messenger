package ru.messenger.chaosmessenger.chat.domain;

/**
 * Group permission policy. Used for {@code whoCanWrite}, {@code whoCanEditInfo}
 * and {@code whoCanInvite} fields on a GROUP {@link Chat}.
 *
 * <p>{@code ALL}/{@code ANYONE} is the most permissive; the rest progressively
 * restrict the action to participants whose role is at least the named tier.
 */
public enum GroupPolicy {
    /** Everyone in the chat. */
    ALL,
    /** Everyone in the chat (alias used for non-write actions, semantically equal to ALL). */
    ANYONE,
    /** Moderator or above. */
    MODERATORS,
    /** Admin or above. */
    ADMINS,
    /** Only the chat owner. */
    OWNER;

    /** Minimal role required to perform the action under this policy. */
    public GroupRole minRole() {
        return switch (this) {
            case ALL, ANYONE -> GroupRole.MEMBER;
            case MODERATORS -> GroupRole.MODERATOR;
            case ADMINS -> GroupRole.ADMIN;
            case OWNER -> GroupRole.OWNER;
        };
    }

    public static GroupPolicy fromString(String raw, GroupPolicy fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        try {
            return GroupPolicy.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }
}
