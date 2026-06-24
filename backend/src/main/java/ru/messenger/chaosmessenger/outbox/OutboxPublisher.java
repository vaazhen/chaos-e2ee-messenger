package ru.messenger.chaosmessenger.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@ConditionalOnProperty(name = "chaos.kafka.enabled", havingValue = "true")
@RequiredArgsConstructor
public class OutboxPublisher {

    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, DomainEvent> kafkaTemplate;

    @Value("${chaos.kafka.outbox.batch-size:100}")
    private int batchSize;

    @Scheduled(fixedDelayString = "${chaos.kafka.outbox.poll-interval:1000}")
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> unpublished = outboxRepository.findAllUnpublished();
        if (unpublished.isEmpty()) {
            return;
        }

        int count = 0;
        for (OutboxEvent event : unpublished) {
            if (count >= batchSize) {
                break;
            }

            DomainEvent domainEvent = DomainEvent.from(event);
            try {
                kafkaTemplate.send(KafkaConfig.DOMAIN_EVENTS_TOPIC, domainEvent.aggregateId(), domainEvent)
                        .get(10, TimeUnit.SECONDS);
                event.markPublished();
                outboxRepository.save(event);
                count++;
            } catch (Exception e) {
                log.error("Failed to publish outbox event {}: {}", event.getId(), e.getMessage());
                return;
            }
        }

        if (count > 0) {
            log.info("Published {} outbox events to Kafka", count);
        }
    }
}
