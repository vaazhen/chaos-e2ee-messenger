package ru.messenger.chaosmessenger.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface OutboxRepository extends JpaRepository<OutboxEvent, Long> {

    @Query(value = """
            SELECT *
            FROM outbox_events
            WHERE status IN ('PENDING', 'FAILED')
              AND next_attempt_at <= CURRENT_TIMESTAMP
            ORDER BY id ASC
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<OutboxEvent> lockDueForPublishing(@Param("limit") int limit);

    @Query(value = """
            SELECT *
            FROM outbox_events
            WHERE status = 'PROCESSING'
              AND locked_at < CURRENT_TIMESTAMP - (:staleSeconds * INTERVAL '1 second')
            ORDER BY id ASC
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<OutboxEvent> lockStaleProcessing(
            @Param("limit") int limit,
            @Param("staleSeconds") int staleSeconds
    );

    @Query(value = """
            SELECT *
            FROM outbox_events
            WHERE id = :id
              AND status IN ('PENDING', 'FAILED')
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<OutboxEvent> lockById(@Param("id") Long id);

    boolean existsByIdempotencyKey(String idempotencyKey);

    long countByStatus(OutboxStatus status);

    @Query(value = """
            SELECT MIN(occurred_at)
              FROM outbox_events
             WHERE status IN ('PENDING', 'FAILED', 'PROCESSING')
            """, nativeQuery = true)
    Optional<Instant> findOldestUnpublishedOccurredAt();
}
