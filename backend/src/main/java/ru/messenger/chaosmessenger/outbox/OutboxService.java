package ru.messenger.chaosmessenger.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxService {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    public void write(String aggregateType, String aggregateId, String eventType, Object payload) {
        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize outbox event payload for {}:{}", aggregateType, aggregateId, e);
            throw new IllegalStateException("Cannot serialize outbox event payload", e);
        }

        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            log.warn("Outbox write outside transaction for {}:{} — events may be lost on failure", aggregateType, aggregateId);
        }

        OutboxEvent event = OutboxEvent.builder()
                .aggregateType(aggregateType)
                .aggregateId(aggregateId)
                .eventType(eventType)
                .payload(json)
                .occurredAt(Instant.now())
                .publishedAt(null)
                .build();

        outboxRepository.save(event);
        log.debug("Outbox event written: {}:{} type={}", aggregateType, aggregateId, eventType);
    }
}
