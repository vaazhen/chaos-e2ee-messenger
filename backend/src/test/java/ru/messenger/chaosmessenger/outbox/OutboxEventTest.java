package ru.messenger.chaosmessenger.outbox;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class OutboxEventTest {

    @Test
    void retriesThenMarksDeadAtMaxAttempts() {
        OutboxEvent event = OutboxEvent.builder()
                .attempts(0)
                .maxAttempts(3)
                .status(OutboxStatus.PROCESSING)
                .build();

        event.markRetryableFailure("boom");
        assertThat(event.getStatus()).isEqualTo(OutboxStatus.FAILED);
        assertThat(event.getAttempts()).isEqualTo(1);
        assertThat(event.getLockedAt()).isNull();
        assertThat(event.getNextAttemptAt()).isAfter(Instant.now().minusSeconds(1));

        event.markRetryableFailure("boom");
        assertThat(event.getStatus()).isEqualTo(OutboxStatus.FAILED);
        assertThat(event.getAttempts()).isEqualTo(2);

        event.markRetryableFailure("boom");
        assertThat(event.isDead()).isTrue();
        assertThat(event.getStatus()).isEqualTo(OutboxStatus.DEAD);
        assertThat(event.getAttempts()).isEqualTo(3);
    }

    @Test
    void markPublishedClearsLock() {
        OutboxEvent event = OutboxEvent.builder()
                .status(OutboxStatus.PROCESSING)
                .build();
        event.markProcessing("owner-1");
        event.markPublished();

        assertThat(event.getStatus()).isEqualTo(OutboxStatus.PUBLISHED);
        assertThat(event.getPublishedAt()).isNotNull();
        assertThat(event.getLockedAt()).isNull();
        assertThat(event.getLockedBy()).isNull();
    }
}
