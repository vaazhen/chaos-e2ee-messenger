package ru.messenger.chaosmessenger.outbox;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class OutboxPublisher {

    private final OutboxService outboxService;
    private final EventTopicResolver eventTopicResolver;
    private final KafkaTemplate<String, DomainEvent> kafkaTemplate;
    private final MeterRegistry meterRegistry;
    private final int batchSize;
    private final int publishTimeoutSeconds;
    private final int staleLockSeconds;
    private final String lockOwner = buildLockOwner();

    public OutboxPublisher(
            OutboxService outboxService,
            EventTopicResolver eventTopicResolver,
            KafkaTemplate<String, DomainEvent> kafkaTemplate,
            MeterRegistry meterRegistry,
            @Value("${chaos.kafka.outbox.batch-size:100}") int batchSize,
            @Value("${chaos.kafka.outbox.publish-timeout-seconds:10}") int publishTimeoutSeconds,
            @Value("${chaos.kafka.outbox.stale-lock-seconds:120}") int staleLockSeconds
    ) {
        this.outboxService = outboxService;
        this.eventTopicResolver = eventTopicResolver;
        this.kafkaTemplate = kafkaTemplate;
        this.meterRegistry = meterRegistry;
        this.batchSize = batchSize;
        this.publishTimeoutSeconds = publishTimeoutSeconds;
        this.staleLockSeconds = staleLockSeconds;
    }

    @Scheduled(fixedDelayString = "${chaos.kafka.outbox.poll-interval:1000}")
    public void publishPendingEvents() {
        int released = outboxService.releaseStaleProcessing(batchSize, staleLockSeconds);
        if (released > 0) {
            log.warn("Released {} stale outbox processing locks", released);
        }

        List<OutboxEvent> events = outboxService.claimDueEvents(batchSize, lockOwner);
        if (events.isEmpty()) {
            return;
        }

        int published = 0;
        for (OutboxEvent event : events) {
            if (publishOne(event)) {
                published++;
            }
        }
        if (published > 0) {
            log.info("Published {} outbox events", published);
        }
    }

    public void dispatch(Long eventId) {
        outboxService.claimEvent(eventId, lockOwner).ifPresent(this::publishOne);
    }

    private boolean publishOne(OutboxEvent event) {
        DomainEvent domainEvent = DomainEvent.from(event);
        try {
            String topic = eventTopicResolver.topicFor(event);
            kafkaTemplate.send(topic, partitionKey(event), domainEvent)
                    .get(publishTimeoutSeconds, TimeUnit.SECONDS);
            outboxService.markPublished(event.getId());
            increment("chaos_outbox_publish_success_total");
            log.debug("Published outbox event eventId={} eventType={}", event.getEventId(), event.getEventType());
            return true;
        } catch (Exception e) {
            boolean dead = outboxService.markFailure(event.getId(), rootMessage(e));
            increment("chaos_outbox_publish_failure_total");
            if (dead) {
                increment("chaos_outbox_dead_total");
                log.error("Outbox event marked DEAD eventId={} aggregateType={} aggregateId={} eventType={} error={}",
                        event.getEventId(), event.getAggregateType(), event.getAggregateId(),
                        event.getEventType(), rootMessage(e));
            } else {
                log.warn("Outbox publish failed eventId={} aggregateType={} aggregateId={} eventType={} error={}",
                        event.getEventId(), event.getAggregateType(), event.getAggregateId(),
                        event.getEventType(), rootMessage(e));
            }
            return false;
        }
    }

    private String partitionKey(OutboxEvent event) {
        if ("message".equalsIgnoreCase(event.getAggregateType())
                || "chat".equalsIgnoreCase(event.getAggregateType())
                || "request".equalsIgnoreCase(event.getAggregateType())) {
            return event.getAggregateId();
        }
        return event.getAggregateType() + ":" + event.getAggregateId();
    }

    private String rootMessage(Exception e) {
        Throwable current = e;
        while (current.getCause() != null) {
            current = current.getCause();
        }
        return current.getMessage() == null ? current.getClass().getSimpleName() : current.getMessage();
    }

    private void increment(String metric) {
        try {
            meterRegistry.counter(metric).increment();
        } catch (Exception ignored) {
        }
    }

    private String buildLockOwner() {
        try {
            return InetAddress.getLocalHost().getHostName() + ":" + ManagementFactory.getRuntimeMXBean().getName();
        } catch (UnknownHostException e) {
            return ManagementFactory.getRuntimeMXBean().getName();
        }
    }
}
