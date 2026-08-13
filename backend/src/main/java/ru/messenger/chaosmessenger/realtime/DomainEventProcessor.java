package ru.messenger.chaosmessenger.realtime;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.message.service.MessageFanoutService;
import ru.messenger.chaosmessenger.outbox.DomainEvent;
import ru.messenger.chaosmessenger.user.repository.UserRepository;

import java.util.ArrayList;
import java.util.List;

/**
 * Single delivery contract: persist the device event log, then notify.
 * Kafka consumer is the only caller.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DomainEventProcessor {

    private final StompEventPublisher stompEventPublisher;
    private final RealtimeEventStore realtimeEventStore;
    private final UserDeviceRepository userDeviceRepository;
    private final UserRepository userRepository;
    private final MessageFanoutService messageFanoutService;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    @Transactional
    public void process(DomainEvent event) {
        try {
            JsonNode payload = objectMapper.readTree(event.payload());
            List<Runnable> afterCommit = new ArrayList<>();
            route(event, payload, afterCommit);
            TransactionUtils.afterCommit(() -> afterCommit.forEach(action -> {
                try {
                    action.run();
                } catch (Exception e) {
                    log.error("Realtime notify failed eventId={} eventType={}",
                            event.eventId(), event.eventType(), e);
                }
            }));
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

    private void route(DomainEvent event, JsonNode payload, List<Runnable> afterCommit) {
        String aggregateType = event.aggregateType() == null ? "" : event.aggregateType().toLowerCase();
        if ("message".equals(aggregateType)) {
            fanoutMessageEvent(event, payload, afterCommit);
            return;
        }
        if ("chat".equals(aggregateType)) {
            fanoutUserDevices(event, payload, "/chats", event.eventType().toLowerCase(), afterCommit);
            return;
        }
        if ("request".equals(aggregateType)) {
            fanoutUserDevices(event, payload, "/requests", event.eventType().toLowerCase(), afterCommit);
            return;
        }
        if ("user".equals(aggregateType)) {
            fanoutUserEvent(event, payload, afterCommit);
        }
    }

    private void fanoutMessageEvent(DomainEvent event, JsonNode payload, List<Runnable> afterCommit) {
        Long chatId = payload.hasNonNull("chatId") ? payload.get("chatId").asLong() : null;
        if (chatId == null) {
            return;
        }

        if ("MESSAGE_STATUS".equals(event.eventType()) || "MESSAGE_BULK_STATUS".equals(event.eventType())) {
            fanoutStatus(event, payload, afterCommit);
            return;
        }

        JsonNode envelopes = payload.get("envelopes");
        JsonNode deviceIds = envelopes != null && envelopes.isObject() && payload.has("deviceIds")
                ? payload.get("deviceIds")
                : payload.get("participantDeviceIds");
        if (deviceIds == null || !deviceIds.isArray()) {
            return;
        }

        boolean inserted = false;
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
            inserted |= publishDurableToDevice(
                    deviceId, event.eventId(), "/chats/" + chatId, devicePayload, afterCommit);
        }

        if (inserted && "MESSAGE_CREATED".equals(event.eventType()) && payload.hasNonNull("senderId")) {
            long senderId = payload.get("senderId").asLong();
            afterCommit.add(() -> messageFanoutService.incrementUnreadForOthers(chatId, senderId));
            afterCommit.add(() -> userRepository.findById(senderId).ifPresent(sender -> {
                Message stub = new Message();
                stub.setId(payload.hasNonNull("messageId") ? payload.get("messageId").asLong() : null);
                stub.setChatId(chatId);
                messageFanoutService.notifyOfflineUsersViaPush(stub, sender);
            }));
        }
    }

    private void fanoutStatus(DomainEvent event, JsonNode payload, List<Runnable> afterCommit) {
        ObjectNode statusPayload = payload.deepCopy();
        statusPayload.put("eventId", event.eventId());
        JsonNode deviceIds = payload.get("targetDeviceIds");
        if (deviceIds == null || !deviceIds.isArray()) {
            return;
        }
        for (JsonNode deviceIdNode : deviceIds) {
            publishDurableToDevice(deviceIdNode.asText(), event.eventId(), "/status", statusPayload, afterCommit);
        }
    }

    private void fanoutUserEvent(DomainEvent event, JsonNode payload, List<Runnable> afterCommit) {
        if ("PROFILE_UPDATED".equals(event.eventType())) {
            fanoutUserDevices(event, payload, "/chats", "profile_updated", afterCommit);
            return;
        }
        if ("USER_STATUS".equals(event.eventType())) {
            ObjectNode statusPayload = payload.deepCopy();
            statusPayload.put("eventId", event.eventId());
            afterCommit.add(() -> stompEventPublisher.publishGlobal("/topic/user/status", statusPayload));
        }
    }

    private void fanoutUserDevices(
            DomainEvent event,
            JsonNode payload,
            String destination,
            String reason,
            List<Runnable> afterCommit
    ) {
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
                publishDurableToDevice(device.getDeviceId(), event.eventId(), destination, eventPayload, afterCommit);
            }
        }
    }

    private boolean publishDurableToDevice(
            String deviceId,
            String eventId,
            String destination,
            ObjectNode payload,
            List<Runnable> afterCommit
    ) {
        RealtimeEventStore.AppendResult stored = realtimeEventStore.append(deviceId, eventId, destination, payload);
        ObjectNode delivered = stored == null || stored.payload() == null ? payload : stored.payload();
        afterCommit.add(() -> stompEventPublisher.publishToDevice(deviceId, destination, delivered));
        return stored != null && stored.inserted();
    }

    private void increment(String metric) {
        try {
            meterRegistry.counter(metric).increment();
        } catch (Exception ignored) {
        }
    }
}
