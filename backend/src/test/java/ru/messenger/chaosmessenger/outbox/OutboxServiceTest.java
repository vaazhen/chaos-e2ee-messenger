package ru.messenger.chaosmessenger.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OutboxServiceTest {

    private OutboxRepository repository;
    private OutboxPublisher publisher;
    private OutboxService service;

    @BeforeEach
    void setUp() {
        repository = mock(OutboxRepository.class);
        publisher = mock(OutboxPublisher.class);
        ObjectProvider<OutboxPublisher> publisherProvider = mock(ObjectProvider.class);
        when(publisherProvider.getIfAvailable()).thenReturn(publisher);
        service = new OutboxService(repository, new ObjectMapper(), new SimpleMeterRegistry(), publisherProvider);
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    void writePersistsBusinessKeyAndDispatchesAfterSave() {
        when(repository.existsByIdempotencyKey("msg:1:MESSAGE_CREATED:1")).thenReturn(false);
        when(repository.saveAndFlush(any(OutboxEvent.class))).thenAnswer(invocation -> {
            OutboxEvent event = invocation.getArgument(0);
            ReflectionTestUtils.setField(event, "id", 42L);
            return event;
        });

        service.write("message", "10", "MESSAGE_CREATED", Map.of("chatId", 10), "corr-1", "msg:1:MESSAGE_CREATED:1");

        verify(repository).saveAndFlush(org.mockito.ArgumentMatchers.argThat(event ->
                "msg:1:MESSAGE_CREATED:1".equals(event.getIdempotencyKey())
                        && "message".equals(event.getAggregateType())
                        && "10".equals(event.getAggregateId())
                        && "MESSAGE_CREATED".equals(event.getEventType())
                        && "corr-1".equals(event.getCorrelationId())
                        && event.getPayload().contains("\"chatId\":10")
                        && event.getStatus() == OutboxStatus.PENDING
        ));
        verify(publisher).dispatchAsync(42L);
    }

    @Test
    void duplicateIdempotencyKeyDoesNotInsertOrDispatch() {
        when(repository.existsByIdempotencyKey("msg:1:MESSAGE_CREATED:1")).thenReturn(true);

        service.write("message", "10", "MESSAGE_CREATED", Map.of("chatId", 10), null, "msg:1:MESSAGE_CREATED:1");

        verify(repository, never()).saveAndFlush(any());
        verify(publisher, never()).dispatchAsync(any());
    }

    @Test
    void uniqueConstraintRaceDoesNotDispatch() {
        when(repository.existsByIdempotencyKey("msg:1:MESSAGE_CREATED:1")).thenReturn(false);
        when(repository.saveAndFlush(any(OutboxEvent.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate idempotency_key"));

        service.write("message", "10", "MESSAGE_CREATED", Map.of("chatId", 10), null, "msg:1:MESSAGE_CREATED:1");

        verify(publisher, never()).dispatchAsync(any());
    }

    @Test
    void correlationFallsBackToMdcWhenCallerOmitsIt() {
        MDC.put("correlationId", "from-mdc");
        when(repository.existsByIdempotencyKey(any())).thenReturn(false);
        when(repository.saveAndFlush(any(OutboxEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.write("chat", "10", "CHAT_CREATED", Map.of("chatId", 10));

        verify(repository).saveAndFlush(org.mockito.ArgumentMatchers.argThat(event ->
                "from-mdc".equals(event.getCorrelationId())
        ));
    }
}
