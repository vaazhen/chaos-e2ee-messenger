package ru.messenger.chaosmessenger.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxService {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    @Transactional(propagation = Propagation.MANDATORY)
    public void write(String aggregateType, String aggregateId, String eventType, Object payload) {
        write(aggregateType, aggregateId, eventType, payload, null);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void write(
            String aggregateType,
            String aggregateId,
            String eventType,
            Object payload,
            String correlationId
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
        OutboxEvent event = OutboxEvent.builder()
                .eventId(UUID.randomUUID().toString())
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
                .correlationId(correlationId)
                .idempotencyKey(UUID.randomUUID().toString())
                .createdAt(now)
                .updatedAt(now)
                .build();

        outboxRepository.save(event);
        increment("chaos_outbox_events_written_total");
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

    private void increment(String metric) {
        try {
            meterRegistry.counter(metric).increment();
        } catch (Exception ignored) {
        }
    }
}
