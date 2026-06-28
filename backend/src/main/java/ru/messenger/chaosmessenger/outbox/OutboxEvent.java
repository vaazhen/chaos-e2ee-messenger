package ru.messenger.chaosmessenger.outbox;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnTransformer;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "outbox_events")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutboxEvent {

    private static final int DEFAULT_MAX_ATTEMPTS = 10;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, length = 36)
    private String eventId;

    @Column(name = "aggregate_type", nullable = false, length = 50)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false, length = 100)
    private String aggregateId;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "event_version", nullable = false)
    private Integer eventVersion;

    @Column(name = "schema_version", nullable = false)
    private Integer schemaVersion;

    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String payload;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OutboxStatus status;

    @Column(name = "attempts", nullable = false)
    private Integer attempts;

    @Column(name = "max_attempts", nullable = false)
    private Integer maxAttempts;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "locked_at")
    private Instant lockedAt;

    @Column(name = "locked_by", length = 100)
    private String lockedBy;

    @Column(name = "last_error")
    private String lastError;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 150)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (eventId == null) {
            eventId = UUID.randomUUID().toString();
        }
        if (eventVersion == null) {
            eventVersion = 1;
        }
        if (schemaVersion == null) {
            schemaVersion = 1;
        }
        if (status == null) {
            status = OutboxStatus.PENDING;
        }
        if (attempts == null) {
            attempts = 0;
        }
        if (maxAttempts == null) {
            maxAttempts = DEFAULT_MAX_ATTEMPTS;
        }
        if (nextAttemptAt == null) {
            nextAttemptAt = now;
        }
        if (occurredAt == null) {
            occurredAt = now;
        }
        if (idempotencyKey == null) {
            idempotencyKey = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public void markProcessing(String owner) {
        status = OutboxStatus.PROCESSING;
        lockedBy = owner;
        lockedAt = Instant.now();
        lastError = null;
    }

    public void markPublished() {
        status = OutboxStatus.PUBLISHED;
        publishedAt = Instant.now();
        lockedAt = null;
        lockedBy = null;
        lastError = null;
    }

    public void markRetryableFailure(String errorMessage) {
        attempts = attempts == null ? 1 : attempts + 1;
        lastError = truncate(errorMessage);
        lockedAt = null;
        lockedBy = null;
        if (attempts >= maxAttempts) {
            status = OutboxStatus.DEAD;
            return;
        }
        status = OutboxStatus.FAILED;
        nextAttemptAt = Instant.now().plus(backoff(attempts));
    }

    public void releaseStaleLock(String errorMessage) {
        status = OutboxStatus.FAILED;
        lockedAt = null;
        lockedBy = null;
        lastError = truncate(errorMessage);
        nextAttemptAt = Instant.now().plusSeconds(5);
    }

    public boolean isDead() {
        return status == OutboxStatus.DEAD;
    }

    private Duration backoff(int attempt) {
        long seconds = Math.min(300L, (long) Math.pow(2, Math.min(attempt, 8)));
        return Duration.ofSeconds(seconds);
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() > 2000 ? value.substring(0, 2000) : value;
    }
}
