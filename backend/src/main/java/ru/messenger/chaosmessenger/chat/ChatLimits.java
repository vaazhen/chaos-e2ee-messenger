package ru.messenger.chaosmessenger.chat;

/**
 * Pairwise group fanout has no MLS. Keep groups small on purpose.
 */
public final class ChatLimits {

    public static final int MAX_GROUP_PARTICIPANTS = 32;

    private ChatLimits() {
    }
}
