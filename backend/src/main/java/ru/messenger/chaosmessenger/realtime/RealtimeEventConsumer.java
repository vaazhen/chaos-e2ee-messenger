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
import ru.messenger.chaosmessenger.outbox.DomainEvent;
import ru.messenger.chaosmessenger.outbox.KafkaConfig;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@ConditionalOnProperty(name = "chaos.kafka.enabled", havingValue = "true")
@RequiredArgsConstructor
public class RealtimeEventConsumer {

    private static final int MAX_DEDUP_CACHE_SIZE = 100_000;

    private final StompEventPublisher stompEventPublisher;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final Set<String> processedEvents = ConcurrentHashMap.newKeySet();

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
    public void handleDomainEvent(DomainEvent event) {
        String eventId = event.eventId();
        if (eventId != null && processedEvents.contains(eventId)) {
            increment("chaos_kafka_consumer_duplicate_total");
            return;
        }

        try {
            JsonNode payload = objectMapper.readTree(event.payload());
            route(event, payload);
            if (eventId != null) {
                processedEvents.add(eventId);
                trimDedupCacheIfNeeded();
            }
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
            stompEventPublisher.publishToDevice(deviceId, "/chats/" + chatId, devicePayload);
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
            stompEventPublisher.publishToDevice(deviceIdNode.asText(), "/status", statusPayload);
        }
    }

    private void fanoutChatEvent(DomainEvent event, JsonNode payload) {
        fanoutChatList(event, payload, event.eventType().toLowerCase());
    }

    private void fanoutRequestEvent(DomainEvent event, JsonNode payload) {
        JsonNode usernames = payload.get("participantUsernames");
        if (usernames == null || !usernames.isArray()) {
            return;
        }
        Map<String, Object> requestEvent = new HashMap<>();
        requestEvent.put("eventId", event.eventId());
        requestEvent.put("chatId", payload.hasNonNull("chatId") ? payload.get("chatId").asLong() : null);
        requestEvent.put("reason", event.eventType().toLowerCase());
        requestEvent.put("eventType", event.eventType());
        for (JsonNode usernameNode : usernames) {
            stompEventPublisher.publishToUser(usernameNode.asText(), "/requests", requestEvent);
        }
    }

    private void fanoutUserEvent(DomainEvent event, JsonNode payload) {
        if ("PROFILE_UPDATED".equals(event.eventType())) {
            fanoutChatList(event, payload, "profile_updated");
            return;
        }
        if ("USER_STATUS".equals(event.eventType())) {
            ObjectNode statusPayload = payload.deepCopy();
            statusPayload.put("eventId", event.eventId());
            stompEventPublisher.publishGlobal("/topic/user/status", statusPayload);
        }
    }

    private void fanoutChatList(DomainEvent event, JsonNode payload, String reason) {
        JsonNode usernames = payload.get("participantUsernames");
        if (usernames == null || !usernames.isArray()) {
            return;
        }
        Map<String, Object> chatListEvent = new HashMap<>();
        chatListEvent.put("eventId", event.eventId());
        chatListEvent.put("chatId", payload.hasNonNull("chatId") ? payload.get("chatId").asLong() : null);
        chatListEvent.put("reason", reason);
        chatListEvent.put("eventType", reason);
        for (JsonNode usernameNode : usernames) {
            stompEventPublisher.publishToUser(usernameNode.asText(), "/chats", chatListEvent);
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
