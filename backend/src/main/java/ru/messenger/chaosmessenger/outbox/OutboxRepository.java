package ru.messenger.chaosmessenger.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OutboxRepository extends JpaRepository<OutboxEvent, Long> {

    @Query("SELECT e FROM OutboxEvent e WHERE e.publishedAt IS NULL ORDER BY e.id ASC")
    List<OutboxEvent> findAllUnpublished();

    @Query("SELECT e FROM OutboxEvent e WHERE e.publishedAt IS NULL AND e.id <= :maxId ORDER BY e.id ASC")
    List<OutboxEvent> findUnpublishedUpTo(@Param("maxId") Long maxId);

    long countByPublishedAtIsNull();
}
