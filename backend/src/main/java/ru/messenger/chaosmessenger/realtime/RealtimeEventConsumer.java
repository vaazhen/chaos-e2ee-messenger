package ru.messenger.chaosmessenger.realtime;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.outbox.DomainEvent;
import ru.messenger.chaosmessenger.outbox.KafkaConfig;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@ConditionalOnProperty(name = "chaos.kafka.enabled", havingValue = "true")
@RequiredArgsConstructor
public class RealtimeEventConsumer {

    private static final int MAX_DEDUP_CACHE_SIZE = 100_000;

    private final StompEventPublisher stompEventPublisher;
    private final RealtimeEventStore realtimeEventStore;
    private final UserDeviceRepository userDeviceRepository;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final Set<String> processedEvents = ConcurrentHashMap.newKeySet();

    private final ThreadLocal<List<Runnable>> pendingStomp = ThreadLocal.withInitial(ArrayList::new);

    @KafkaListener(
            topics = {
                    KafkaConfig.MESSAGE_EVENTS_TOPIC,
                    KafkaConfig.CHAT_EVENTS_TOPIC,
                    KafkaConfig.RECEIPT_EVENTS_TOPIC,
                    KafkaConfig.USER_EVENTS_TOPIC,
                    KafkaConfig.SECURITY_EVENTS_TOPIC
            },
            groupId = "${chaos.kafka.realtime.group-id:chaos-realtime-${random.uuid}}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void handleDomainEvent(DomainEvent event) {
        String eventId = event.eventId();
        boolean syncActive = TransactionSynchronizationManager.isSynchronizationActive();

        if (eventId != null) {
            if (processedEvents.contains(eventId)) {
                increment("chaos_kafka_consumer_duplicate_total");
                return;
            }
            if (syncActive) {
                registerAfterCommit(eventId);
            }
        } else if (syncActive) {
            registerFlushOnly();
        }

        try {
            JsonNode payload = objectMapper.readTree(event.payload());
            route(event, payload);
            increment("chaos_kafka_consumer_success_total");
        } catch (JsonProcessingException e) {
            increment("chaos_kafka_consumer_failure_total");
            log.error("Failed to parse realtime event eventId={} aggregateType={} aggregateId={} eventType={}",
                    event.eventId(), event.aggregateType(), event.aggregateId(), event.eventType(), e);
            throw new IllegalStateException("Cannot parse realtime event payload", e);
        } catch (RuntimeException e) {
            increment("chaos_kafka_consumer_failure_total");
            log.error("Failed to handle realtime event eventId={} aggregateType={} aggregateId={} eventType={}",
                    event.eventId(), event.aggregateType(), event.aggregateId(), event.eventType(), e);
            throw e;
        } finally {
            if (!syncActive) {
                flushPendingStomp();
                pendingStomp.get().clear();
            }
        }
    }

    private void route(DomainEvent event, JsonNode payload) {
        String aggregateType = event.aggregateType() == null ? "" : event.aggregateType().toLowerCase();
        if ("message".equals(aggregateType)) {
            fanoutMessageEvent(event, payload);
            return;
        }
        if ("chat".equals(aggregateType)) {
            fanoutChatEvent(event, payload);
            return;
        }
        if ("request".equals(aggregateType)) {
            fanoutRequestEvent(event, payload);
            return;
        }
        if ("user".equals(aggregateType)) {
            fanoutUserEvent(event, payload);
        }
    }

    private void fanoutMessageEvent(DomainEvent event, JsonNode payload) {
        Long chatId = payload.hasNonNull("chatId") ? payload.get("chatId").asLong() : null;
        if (chatId == null) {
            return;
        }

        if ("MESSAGE_STATUS".equals(event.eventType()) || "MESSAGE_BULK_STATUS".equals(event.eventType())) {
            fanoutStatus(event, payload);
            return;
        }

        JsonNode envelopes = payload.get("envelopes");
        JsonNode deviceIds = envelopes != null && envelopes.isObject() && payload.has("deviceIds")
                ? payload.get("deviceIds")
                : payload.get("participantDeviceIds");
        if (deviceIds == null || !deviceIds.isArray()) {
            return;
        }

        for (JsonNode deviceIdNode : deviceIds) {
            String deviceId = deviceIdNode.asText();
            JsonNode envelope = envelopes == null ? null : envelopes.get(deviceId);
            ObjectNode devicePayload = payload.deepCopy();
            devicePayload.put("eventId", event.eventId());
            devicePayload.put("type", event.eventType());
            devicePayload.put("eventType", event.eventType());
            if (envelope != null && !envelope.isNull()) {
                devicePayload.set("envelope", envelope);
            }
            devicePayload.remove("envelopes");
            publishDurableToDevice(deviceId, event.eventId(), "/chats/" + chatId, devicePayload);
        }
    }

    private void fanoutStatus(DomainEvent event, JsonNode payload) {
        ObjectNode statusPayload = payload.deepCopy();
        statusPayload.put("eventId", event.eventId());
        JsonNode deviceIds = payload.get("targetDeviceIds");
        if (deviceIds == null || !deviceIds.isArray()) {
            return;
        }
        for (JsonNode deviceIdNode : deviceIds) {
            publishDurableToDevice(deviceIdNode.asText(), event.eventId(), "/status", statusPayload);
        }
    }

    private void fanoutChatEvent(DomainEvent event, JsonNode payload) {
        fanoutUserDevices(event, payload, "/chats", event.eventType().toLowerCase());
    }

    private void fanoutRequestEvent(DomainEvent event, JsonNode payload) {
        fanoutUserDevices(event, payload, "/requests", event.eventType().toLowerCase());
    }

    private void fanoutUserEvent(DomainEvent event, JsonNode payload) {
        if ("PROFILE_UPDATED".equals(event.eventType())) {
            fanoutUserDevices(event, payload, "/chats", "profile_updated");
            return;
        }
        if ("USER_STATUS".equals(event.eventType())) {
            ObjectNode statusPayload = payload.deepCopy();
            statusPayload.put("eventId", event.eventId());
            pendingStomp.get().add(() -> stompEventPublisher.publishGlobal("/topic/user/status", statusPayload));
        }
    }

    private void fanoutUserDevices(DomainEvent event, JsonNode payload, String destination, String reason) {
        JsonNode usernames = payload.get("participantUsernames");
        if (usernames == null || !usernames.isArray()) {
            return;
        }
        ObjectNode eventPayload = objectMapper.createObjectNode();
        eventPayload.put("eventId", event.eventId());
        if (payload.hasNonNull("chatId")) {
            eventPayload.put("chatId", payload.get("chatId").asLong());
        }
        eventPayload.put("reason", reason);
        eventPayload.put("eventType", event.eventType());

        for (JsonNode usernameNode : usernames) {
            for (UserDevice device : userDeviceRepository.findActiveByUsernameWithUser(usernameNode.asText())) {
                publishDurableToDevice(device.getDeviceId(), event.eventId(), destination, eventPayload);
            }
        }
    }

    private void registerAfterCommit(String eventId) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                processedEvents.add(eventId);
                trimDedupCacheIfNeeded();
                flushPendingStomp();
            }

            @Override
            public void afterCompletion(int status) {
                pendingStomp.get().clear();
            }
        });
    }

    private void registerFlushOnly() {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                flushPendingStomp();
            }

            @Override
            public void afterCompletion(int status) {
                pendingStomp.get().clear();
            }
        });
    }

    private void publishDurableToDevice(
            String deviceId,
            String eventId,
            String destination,
            ObjectNode payload
    ) {
        ObjectNode storedPayload = realtimeEventStore.append(deviceId, eventId, destination, payload);
        pendingStomp.get().add(() -> stompEventPublisher.publishToDevice(deviceId, destination, storedPayload));
    }

    private void flushPendingStomp() {
        List<Runnable> tasks = pendingStomp.get();
        for (Runnable task : tasks) {
            try {
                task.run();
            } catch (Exception e) {
                log.error("Failed to deliver STOMP message after commit", e);
            }
        }
    }

    private void trimDedupCacheIfNeeded() {
        if (processedEvents.size() > MAX_DEDUP_CACHE_SIZE) {
            processedEvents.clear();
        }
    }

    private void increment(String metric) {
        try {
            meterRegistry.counter(metric).increment();
        } catch (Exception ignored) {
        }
    }
}
