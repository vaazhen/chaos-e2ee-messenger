package ru.messenger.chaosmessenger.realtime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.KafkaContainer;
import org.testcontainers.utility.DockerImageName;
import ru.messenger.chaosmessenger.outbox.DomainEvent;
import ru.messenger.chaosmessenger.outbox.OutboxPublisher;
import ru.messenger.chaosmessenger.outbox.OutboxRepository;
import ru.messenger.chaosmessenger.outbox.OutboxService;
import ru.messenger.chaosmessenger.outbox.OutboxStatus;
import ru.messenger.chaosmessenger.realtime.dto.RealtimeSyncResponse;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
@ActiveProfiles("test")
@DisplayName("send contract: outbox -> kafka -> durable log -> sync cursor")
class DurableRealtimeDeliveryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("chaos_messenger_test")
            .withUsername("test")
            .withPassword("test");

    @Container
    @SuppressWarnings("resource")
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("apache/kafka:3.8.1"));

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("jwt.secret", () -> "test-secret-key-must-be-32-chars-long!!");
        registry.add("chaos.kafka.bootstrap-servers", kafka::getBootstrapServers);
        registry.add("chaos.kafka.topic.replicas", () -> "1");
    }

    @Autowired
    TransactionTemplate transactionTemplate;
    @Autowired
    OutboxService outboxService;
    @Autowired
    OutboxPublisher outboxPublisher;
    @Autowired
    RealtimeEventStore realtimeEventStore;
    @Autowired
    OutboxRepository outboxRepository;
    @Autowired
    DomainEventProcessor domainEventProcessor;
    @Autowired
    ObjectMapper objectMapper;

    @Test
    void outboxWriteBecomesDurableDeviceEventThroughKafka() {
        transactionTemplate.executeWithoutResult(status -> outboxService.write(
                "message",
                "10",
                "MESSAGE_CREATED",
                Map.of(
                        "chatId", 10,
                        "messageId", 500,
                        "senderId", 1,
                        "deviceIds", List.of("device-a"),
                        "envelopes", Map.of("device-a", Map.of("ciphertext", "cipher"))
                ),
                "corr-test",
                "msg:500:MESSAGE_CREATED:1"
        ));

        outboxPublisher.publishPendingEvents();

        RealtimeSyncResponse sync = awaitEvents("device-a", 1);
        assertThat(sync.events()).hasSize(1);
        assertThat(sync.events().get(0).destination()).isEqualTo("/chats/10");
        assertThat(sync.events().get(0).payload().has("envelopes")).isFalse();
        assertThat(sync.events().get(0).payload().get("envelope").get("ciphertext").asText()).isEqualTo("cipher");
        assertThat(outboxRepository.findAll())
                .anySatisfy(event -> {
                    if ("msg:500:MESSAGE_CREATED:1".equals(event.getIdempotencyKey())) {
                        assertThat(event.getStatus()).isEqualTo(OutboxStatus.PUBLISHED);
                    }
                });
    }

    @Test
    void duplicateIdempotencyKeyDoesNotCreateSecondEvent() {
        Map<String, Object> payload = Map.of(
                "chatId", 11,
                "messageId", 501,
                "senderId", 1,
                "deviceIds", List.of("device-b"),
                "envelopes", Map.of("device-b", Map.of("ciphertext", "cipher"))
        );
        transactionTemplate.executeWithoutResult(status -> {
            outboxService.write("message", "11", "MESSAGE_CREATED", payload, null, "msg:501:MESSAGE_CREATED:1");
            outboxService.write("message", "11", "MESSAGE_CREATED", payload, null, "msg:501:MESSAGE_CREATED:1");
        });
        outboxPublisher.publishPendingEvents();

        RealtimeSyncResponse sync = awaitEvents("device-b", 1);
        assertThat(sync.events()).hasSize(1);
    }

    @Test
    void syncCursorDoesNotReplayAlreadyConsumedEvents() {
        transactionTemplate.executeWithoutResult(status -> {
            outboxService.write(
                    "message", "12", "MESSAGE_CREATED",
                    Map.of(
                            "chatId", 12,
                            "messageId", 600,
                            "senderId", 1,
                            "deviceIds", List.of("device-c"),
                            "envelopes", Map.of("device-c", Map.of("ciphertext", "one"))
                    ),
                    null,
                    "msg:600:MESSAGE_CREATED:1"
            );
            outboxService.write(
                    "message", "12", "MESSAGE_CREATED",
                    Map.of(
                            "chatId", 12,
                            "messageId", 601,
                            "senderId", 1,
                            "deviceIds", List.of("device-c"),
                            "envelopes", Map.of("device-c", Map.of("ciphertext", "two"))
                    ),
                    null,
                    "msg:601:MESSAGE_CREATED:1"
            );
        });
        outboxPublisher.publishPendingEvents();

        RealtimeSyncResponse firstPage = awaitEvents("device-c", 2);
        assertThat(firstPage.events()).hasSize(2);
        long afterFirst = firstPage.events().get(0).sequence();

        RealtimeSyncResponse rest = realtimeEventStore.readAfter("device-c", afterFirst, 20);
        assertThat(rest.events()).hasSize(1);
        assertThat(rest.events().get(0).payload().get("envelope").get("ciphertext").asText()).isEqualTo("two");
    }

    @Test
    void outboxRowDisappearsWhenTheSurroundingTransactionRollsBack() {
        transactionTemplate.executeWithoutResult(status -> {
            outboxService.write(
                    "message",
                    "30",
                    "MESSAGE_CREATED",
                    Map.of(
                            "chatId", 30,
                            "messageId", 700,
                            "senderId", 1,
                            "deviceIds", List.of("device-rollback"),
                            "envelopes", Map.of("device-rollback", Map.of("ciphertext", "nope"))
                    ),
                    null,
                    "msg:700:MESSAGE_CREATED:rollback"
            );
            status.setRollbackOnly();
        });

        assertThat(outboxRepository.findAll())
                .noneMatch(event -> "msg:700:MESSAGE_CREATED:rollback".equals(event.getIdempotencyKey()));
        assertThat(realtimeEventStore.readAfter("device-rollback", 0, 20).events()).isEmpty();
    }

    @Test
    void crashMidFanoutDoesNotLeavePartialDeviceLog() {
        com.fasterxml.jackson.databind.node.ObjectNode payload = objectMapper.createObjectNode();
        payload.put("eventId", "partial-1");
        assertThatThrownBy(() -> transactionTemplate.executeWithoutResult(status -> {
            realtimeEventStore.append("device-partial-a", "partial-1", "/chats/40", payload);
            realtimeEventStore.append("device-partial-b", "partial-1", "/chats/40", payload);
            throw new IllegalStateException("consumer crashed");
        })).isInstanceOf(IllegalStateException.class);

        assertThat(realtimeEventStore.readAfter("device-partial-a", 0, 20).events()).isEmpty();
        assertThat(realtimeEventStore.readAfter("device-partial-b", 0, 20).events()).isEmpty();
    }

    @Test
    void sameEventIdIsIdempotentOnDurableLogAndFansOutToOfflineDevice() throws JsonProcessingException {
        String payload = objectMapper.writeValueAsString(Map.of(
                "chatId", 50,
                "messageId", 800,
                "senderId", 1,
                "deviceIds", List.of("device-online", "device-offline"),
                "envelopes", Map.of(
                        "device-online", Map.of("ciphertext", "blob"),
                        "device-offline", Map.of("ciphertext", "blob")
                )
        ));
        DomainEvent event = new DomainEvent(
                "evt-multi-1",
                "message",
                "50",
                "MESSAGE_CREATED",
                1,
                1,
                payload,
                Instant.parse("2026-08-14T00:00:00Z"),
                "corr-multi",
                "msg:800:MESSAGE_CREATED:1"
        );

        domainEventProcessor.process(event);
        domainEventProcessor.process(event);

        RealtimeSyncResponse online = realtimeEventStore.readAfter("device-online", 0, 20);
        RealtimeSyncResponse offline = realtimeEventStore.readAfter("device-offline", 0, 20);
        assertThat(online.events()).hasSize(1);
        assertThat(offline.events()).hasSize(1);
        assertThat(offline.events().get(0).payload().get("envelope").get("ciphertext").asText()).isEqualTo("blob");
    }

    @Test
    void syncOrderFollowsPersistSequenceNotArrivalWish() {
        com.fasterxml.jackson.databind.node.ObjectNode late = objectMapper.createObjectNode();
        late.put("logical", "second");
        com.fasterxml.jackson.databind.node.ObjectNode early = objectMapper.createObjectNode();
        early.put("logical", "first");

        realtimeEventStore.append("device-order", "evt-second", "/chats/60", late);
        realtimeEventStore.append("device-order", "evt-first", "/chats/60", early);

        RealtimeSyncResponse sync = realtimeEventStore.readAfter("device-order", 0, 20);
        assertThat(sync.events()).hasSize(2);
        assertThat(sync.events().get(0).payload().get("logical").asText()).isEqualTo("second");
        assertThat(sync.events().get(1).payload().get("logical").asText()).isEqualTo("first");
        assertThat(sync.events().get(0).sequence()).isLessThan(sync.events().get(1).sequence());
    }

    private RealtimeSyncResponse awaitEvents(String deviceId, int minSize) {
        return awaitResult(
                () -> realtimeEventStore.readAfter(deviceId, 0, 20),
                sync -> sync.events().size() >= minSize,
                Duration.ofSeconds(20)
        );
    }

    private static <T> T awaitResult(Supplier<T> supplier, java.util.function.Predicate<T> ready, Duration timeout) {
        Instant deadline = Instant.now().plus(timeout);
        T last = supplier.get();
        while (Instant.now().isBefore(deadline)) {
            last = supplier.get();
            if (ready.test(last)) {
                return last;
            }
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        return last;
    }
}
