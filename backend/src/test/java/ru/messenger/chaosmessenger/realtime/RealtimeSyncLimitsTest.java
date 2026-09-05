package ru.messenger.chaosmessenger.realtime;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RealtimeSyncLimitsTest {

    @Test
    void clampsHugeAndNonPositiveLimits() {
        assertThat(RealtimeSyncLimits.clamp(100_000_000)).isEqualTo(RealtimeSyncLimits.MAX);
        assertThat(RealtimeSyncLimits.clamp(0)).isEqualTo(1);
        assertThat(RealtimeSyncLimits.clamp(-3)).isEqualTo(1);
        assertThat(RealtimeSyncLimits.clamp(200)).isEqualTo(200);
    }
}
