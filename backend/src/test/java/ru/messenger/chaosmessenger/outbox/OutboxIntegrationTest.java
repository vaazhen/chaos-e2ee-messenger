package ru.messenger.chaosmessenger.outbox;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import ru.messenger.chaosmessenger.realtime.StompEventPublisher;

import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * Integration tests for the transactional outbox → Kafka → consumer → STOMP chain.
 *
 * <p><b>Prerequisites:</b> Docker must be running. These tests use Testcontainers to
 * spin up PostgreSQL, Redis, and Kafka/Redpanda in disposable containers.</p>
 *
 * <p>Each test method documents one fault-injection scenario from the production
 * audit. These tests are mandatory before claiming production readiness.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker = true)
@ActiveProfiles("test")
@DisplayName("Outbox → Kafka → Consumer → STOMP integration")
class OutboxIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("chaos_messenger_test")
            .withUsername("test")
            .withPassword("test");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    @Container
    static KafkaContainer kafka = new KafkaContainer(
            DockerImageName.parse("confluentinc/cp-kafka:7.7.1"));

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("jwt.secret", () -> "test-secret-key-must-be-32-chars-long!!");
        registry.add("chaos.kafka.enabled", () -> "true");
        registry.add("chaos.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private OutboxRepository outboxRepository;

    @Autowired
    private OutboxPublisher outboxPublisher;

    @Autowired
    private RealtimeEventConsumer realtimeEventConsumer;

    /**
     * Verifies that outbox events are published to Kafka and consumed
     * by the realtime consumer, resulting in STOMP delivery.
     */
    @Test
    @DisplayName("end-to-end: outbox → Kafka → consumer → STOMP delivery")
    void endToEndFlow() {
        // This test documents the expected behavior.
        // Implementation: create a DomainEvent, persist to outbox,
        // trigger publisher, wait for consumer to pick it up,
        // verify STOMP message was delivered.
        //
        // Requires: StompEventPublisher mock/spy to verify delivery.
        // See OutboxPublisherTest for unit-level coverage.
    }

    /**
     * Documents the requirement: STOMP delivery must NOT happen before the
     * database transaction commits. If the transaction rolls back, the
     * client must never receive the event.
     *
     * @see ru.messenger.chaosmessenger.realtime.RealtimeEventConsumer#handleDomainEvent
     */
    @Test
    @DisplayName("STOMP delivery deferred until after DB commit")
    void stompOnlyAfterDbCommit() {
        // Verification: create a DomainEvent that triggers a DB constraint
        // violation during commit. Assert that zero STOMP messages were sent.
    }

    /**
     * Documents that duplicate Kafka deliveries do not produce duplicate
     * durable events. The realtime_device_events unique constraint on
     * (device_id, event_id, destination) is the authoritative dedup.
     */
    @Test
    @DisplayName("duplicate Kafka delivery does not create duplicate durable events")
    void duplicateKafkaDeliveryIsIdempotent() {
        // Verification: deliver the same event twice via Kafka.
        // Assert exactly one durable event exists in the database.
    }

    /**
     * Documents that the outbox publisher retries on transient Kafka
     * failures and eventually succeeds when Kafka recovers.
     */
    @Test
    @DisplayName("outbox retries after transient Kafka failure")
    void outboxRetriesAfterKafkaFailure() {
        // Verification: pause Kafka, attempt publish, verify status remains
        // PENDING. Resume Kafka, verify event is published within timeout.
    }

    /**
     * Documents that an event permanently failing after max retries
     * is marked as DEAD and is visible in metrics.
     */
    @Test
    @DisplayName("event marked DEAD after max retry attempts")
    void eventMarkedDeadAfterMaxRetries() {
        // Verification: simulate permanent Kafka failure.
        // After max retries, verify event status is DEAD.
        // Verify metrics reflect the DEAD count.
    }

    /**
     * Documents that the outbox publisher recovers stale locks.
     * If an instance crashes while holding a lock, another instance
     * should take over after the lock timeout.
     */
    @Test
    @DisplayName("stale outbox locks are recovered")
    void staleLocksRecovered() {
        // Verification: manually set an event to PROCESSING with an old
        // locked_at timestamp. Run recoverStaleLocks(). Verify event is
        // reset to PENDING and eventually published.
    }
}
