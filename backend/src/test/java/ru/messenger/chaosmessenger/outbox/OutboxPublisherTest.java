package ru.messenger.chaosmessenger.outbox;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OutboxPublisherTest {

    private OutboxService outboxService;
    private KafkaTemplate<String, DomainEvent> kafka;
    private OutboxPublisher publisher;

    @BeforeEach
    void setUp() {
        outboxService = mock(OutboxService.class);
        kafka = mock(KafkaTemplate.class);
        when(outboxService.releaseStaleProcessing(anyInt(), anyInt())).thenReturn(0);
        publisher = new OutboxPublisher(
                outboxService,
                new EventTopicResolver(),
                kafka,
                new SimpleMeterRegistry(),
                100,
                10,
                120
        );
    }

    @Test
    void sendsToKafkaThenMarksPublished() {
        OutboxEvent event = event(8L, "message", "10", "MESSAGE_CREATED");
        when(outboxService.claimDueEvents(eq(100), anyString())).thenReturn(List.of(event));
        when(kafka.send(eq("chaos.message.events"), eq("10"), any(DomainEvent.class)))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));

        publisher.publishPendingEvents();

        verify(kafka).send(eq("chaos.message.events"), eq("10"), any(DomainEvent.class));
        verify(outboxService).markPublished(8L);
        verify(outboxService, never()).markFailure(any(), any());
    }

    @Test
    void kafkaFailureMarksRetryAndDoesNotPublish() {
        OutboxEvent event = event(9L, "chat", "11", "CHAT_CREATED");
        when(outboxService.claimDueEvents(eq(100), anyString())).thenReturn(List.of(event));
        when(kafka.send(eq("chaos.chat.events"), eq("11"), any(DomainEvent.class)))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("broker down")));
        when(outboxService.markFailure(eq(9L), anyString())).thenReturn(false);

        publisher.publishPendingEvents();

        verify(outboxService).markFailure(eq(9L), anyString());
        verify(outboxService, never()).markPublished(9L);
    }

    @Test
    void dispatchClaimsSingleRowThenSendsToKafka() {
        OutboxEvent event = event(12L, "message", "10", "MESSAGE_CREATED");
        when(outboxService.claimEvent(eq(12L), anyString())).thenReturn(Optional.of(event));
        when(kafka.send(eq("chaos.message.events"), eq("10"), any(DomainEvent.class)))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));

        publisher.dispatch(12L);

        verify(kafka).send(eq("chaos.message.events"), eq("10"), any(DomainEvent.class));
        verify(outboxService).markPublished(12L);
    }

    @Test
    void partitionKeyKeepsAChatOnOnePartition() {
        OutboxEvent first = event(1L, "message", "42", "MESSAGE_CREATED");
        OutboxEvent second = event(2L, "message", "42", "MESSAGE_EDITED");
        OutboxEvent otherChat = event(3L, "chat", "99", "CHAT_CREATED");

        assertThat(publisher.partitionKey(first)).isEqualTo("42");
        assertThat(publisher.partitionKey(second)).isEqualTo("42");
        assertThat(publisher.partitionKey(otherChat)).isEqualTo("99");
        assertThat(publisher.partitionKey(event(4L, "user", "7", "PROFILE_UPDATED")))
                .isEqualTo("user:7");
    }

    @Test
    void dispatchAsyncPublishesOffCallerThread() {
        OutboxEvent event = event(13L, "message", "10", "MESSAGE_CREATED");
        when(outboxService.claimEvent(eq(13L), anyString())).thenReturn(Optional.of(event));
        when(kafka.send(eq("chaos.message.events"), eq("10"), any(DomainEvent.class)))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));

        publisher.dispatchAsync(13L);

        verify(outboxService, timeout(1000)).claimEvent(eq(13L), anyString());
        verify(outboxService, timeout(1000)).markPublished(13L);
    }

    private static OutboxEvent event(long id, String aggregate, String aggregateId, String type) {
        OutboxEvent event = OutboxEvent.builder()
                .eventId("evt-" + id)
                .aggregateType(aggregate)
                .aggregateId(aggregateId)
                .eventType(type)
                .eventVersion(1)
                .schemaVersion(1)
                .payload("{\"chatId\":10}")
                .status(OutboxStatus.PENDING)
                .attempts(0)
                .maxAttempts(10)
                .nextAttemptAt(Instant.now())
                .occurredAt(Instant.now())
                .idempotencyKey("key-" + id)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        ReflectionTestUtils.setField(event, "id", id);
        return event;
    }
}
