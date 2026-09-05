package ru.messenger.chaosmessenger.realtime;

public final class RealtimeSyncLimits {

    public static final int MAX = 500;

    private RealtimeSyncLimits() {
    }

    public static int clamp(int requestedLimit) {
        return Math.max(1, Math.min(requestedLimit, MAX));
    }
}
