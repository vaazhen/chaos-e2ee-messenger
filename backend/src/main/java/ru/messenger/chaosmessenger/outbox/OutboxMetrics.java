package ru.messenger.chaosmessenger.outbox;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class OutboxMetrics {

    public OutboxMetrics(MeterRegistry meterRegistry, OutboxService outboxService) {
        Gauge.builder("chaos_outbox_pending_count", outboxService, service -> service.countByStatus(OutboxStatus.PENDING))
                .register(meterRegistry);
        Gauge.builder("chaos_outbox_failed_count", outboxService, service -> service.countByStatus(OutboxStatus.FAILED))
                .register(meterRegistry);
        Gauge.builder("chaos_outbox_processing_count", outboxService, service -> service.countByStatus(OutboxStatus.PROCESSING))
                .register(meterRegistry);
        Gauge.builder("chaos_outbox_dead_count", outboxService, service -> service.countByStatus(OutboxStatus.DEAD))
                .register(meterRegistry);
        Gauge.builder("chaos_outbox_oldest_pending_seconds", outboxService, OutboxService::oldestPendingAgeSeconds)
                .register(meterRegistry);
    }
}
