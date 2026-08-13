package ru.messenger.chaosmessenger.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ru.messenger.chaosmessenger.common.TransactionUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class OutboxService implements EventPublisher {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final ObjectProvider<OutboxPublisher> outboxPublisher;

    public OutboxService(
            OutboxRepository outboxRepository,
            ObjectMapper objectMapper,
            MeterRegistry meterRegistry,
            ObjectProvider<OutboxPublisher> outboxPublisher
    ) {
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
        this.outboxPublisher = outboxPublisher;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void publish(String aggregateType, String aggregateId, String eventType, Object payload) {
        write(aggregateType, aggregateId, eventType, payload, null, null);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void publish(
            String aggregateType,
            String aggregateId,
            String eventType,
            Object payload,
            String correlationId,
            String idempotencyKey
    ) {
        write(aggregateType, aggregateId, eventType, payload, correlationId, idempotencyKey);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void write(String aggregateType, String aggregateId, String eventType, Object payload) {
        write(aggregateType, aggregateId, eventType, payload, null, null);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void write(
            String aggregateType,
            String aggregateId,
            String eventType,
            Object payload,
            String correlationId
    ) {
        write(aggregateType, aggregateId, eventType, payload, correlationId, null);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void write(
            String aggregateType,
            String aggregateId,
            String eventType,
            Object payload,
            String correlationId,
            String idempotencyKey
    ) {
        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize outbox payload aggregateType={} aggregateId={} eventType={}",
                    aggregateType, aggregateId, eventType, e);
            throw new IllegalStateException("Cannot serialize outbox event payload", e);
        }

        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            log.warn("Outbox write outside transaction aggregateType={} aggregateId={} eventType={}",
                    aggregateType, aggregateId, eventType);
        }

        Instant now = Instant.now();
        String eventId = UUID.randomUUID().toString();
        String resolvedKey = idempotencyKey == null || idempotencyKey.isBlank()
                ? OutboxIds.key(aggregateType, aggregateId, eventType, eventId)
                : OutboxIds.key(idempotencyKey);
        String resolvedCorrelation = correlationId != null ? correlationId : MDC.get("correlationId");

        OutboxEvent event = OutboxEvent.builder()
                .eventId(eventId)
                .aggregateType(aggregateType)
                .aggregateId(aggregateId)
                .eventType(eventType)
                .eventVersion(1)
                .schemaVersion(1)
                .payload(json)
                .status(OutboxStatus.PENDING)
                .attempts(0)
                .maxAttempts(10)
                .nextAttemptAt(now)
                .occurredAt(now)
                .correlationId(resolvedCorrelation)
                .idempotencyKey(resolvedKey)
                .createdAt(now)
                .updatedAt(now)
                .build();

        if (outboxRepository.existsByIdempotencyKey(resolvedKey)) {
            log.debug("Duplicate outbox event skipped key={} aggregateType={} aggregateId={} eventType={}",
                    resolvedKey, aggregateType, aggregateId, eventType);
            return;
        }

        try {
            outboxRepository.saveAndFlush(event);
        } catch (DataIntegrityViolationException duplicate) {
            log.debug("Duplicate outbox event raced key={} aggregateType={} aggregateId={} eventType={}",
                    resolvedKey, aggregateType, aggregateId, eventType);
            return;
        }

        increment("chaos_outbox_events_written_total");
        Long eventPk = event.getId();
        TransactionUtils.afterCommit(() -> {
            OutboxPublisher publisher = outboxPublisher.getIfAvailable();
            if (publisher != null && eventPk != null) {
                publisher.dispatch(eventPk);
            }
        });
        log.debug("Outbox event written eventId={} aggregateType={} aggregateId={} eventType={}",
                event.getEventId(), aggregateType, aggregateId, eventType);
    }

    @Transactional
    public List<OutboxEvent> claimDueEvents(int limit, String lockOwner) {
        List<OutboxEvent> events = outboxRepository.lockDueForPublishing(limit);
        events.forEach(event -> event.markProcessing(lockOwner));
        outboxRepository.saveAll(events);
        return events;
    }

    @Transactional
    public Optional<OutboxEvent> claimEvent(Long eventId, String lockOwner) {
        List<OutboxEvent> events = outboxRepository.lockById(eventId);
        if (events.isEmpty()) {
            return Optional.empty();
        }
        OutboxEvent event = events.get(0);
        event.markProcessing(lockOwner);
        outboxRepository.save(event);
        return Optional.of(event);
    }

    @Transactional
    public int releaseStaleProcessing(int limit, int staleSeconds) {
        List<OutboxEvent> events = outboxRepository.lockStaleProcessing(limit, staleSeconds);
        events.forEach(event -> event.releaseStaleLock("Released stale processing lock"));
        outboxRepository.saveAll(events);
        return events.size();
    }

    @Transactional
    public void markPublished(Long eventId) {
        OutboxEvent event = outboxRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Outbox event not found: " + eventId));
        event.markPublished();
        outboxRepository.save(event);
    }

    @Transactional
    public boolean markFailure(Long eventId, String errorMessage) {
        OutboxEvent event = outboxRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Outbox event not found: " + eventId));
        event.markRetryableFailure(errorMessage);
        outboxRepository.save(event);
        return event.isDead();
    }

    public long countByStatus(OutboxStatus status) {
        return outboxRepository.countByStatus(status);
    }

    public double oldestPendingAgeSeconds() {
        return outboxRepository.findOldestUnpublishedOccurredAt()
                .map(occurredAt -> Math.max(0d, Duration.between(occurredAt, Instant.now()).toMillis() / 1000d))
                .orElse(0d);
    }

    private void increment(String metric) {
        try {
            meterRegistry.counter(metric).increment();
        } catch (Exception ignored) {
        }
    }
}
