package ru.messenger.chaosmessenger.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.DltStrategy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@ConditionalOnProperty(name = "chaos.kafka.enabled", havingValue = "true")
@RequiredArgsConstructor
public class WebSocketEventConsumer {

    private static final List<String> MESSAGE_EVENT_TYPES = List.of(
            "MESSAGE_CREATED", "MESSAGE_EDITED", "MESSAGE_DELETED",
            "MESSAGE_REACTION", "MESSAGE_STATUS", "MESSAGE_BULK_STATUS"
    );

    private static final List<String> CHAT_EVENT_TYPES = List.of(
            "CHAT_CREATED", "CHAT_UPDATED", "CHAT_DELETED",
            "GROUP_PARTICIPANTS_INVITED", "GROUP_ROLE_UPDATED",
            "GROUP_SETTINGS_UPDATED", "GROUP_PERMISSIONS_UPDATED",
            "GROUP_PARTICIPANT_REMOVED", "GROUP_ARCHIVED",
            "GROUP_PARTICIPANT_MUTED", "GROUP_PARTICIPANT_UNMUTED",
            "GROUP_PARTICIPANT_BANNED", "GROUP_PARTICIPANT_UNBANNED",
            "CHAT_DELETED_FOR_EVERYONE", "MESSAGE_CREATED", "MESSAGE_DELETED",
            "MESSAGE_REACTION", "MESSAGE_REACTION"
    );

    private static final List<String> REQUEST_EVENT_TYPES = List.of(
            "REQUEST_CREATED", "REQUEST_ACCEPTED", "REQUEST_DECLINED",
            "REQUEST_MESSAGE"
    );

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 1000),
            dltStrategy = DltStrategy.FAIL_ON_ERROR,
            dltTopicSuffix = ".dlt",
            kafkaTemplate = "kafkaTemplate"
    )
    @KafkaListener(topics = KafkaConfig.DOMAIN_EVENTS_TOPIC, containerFactory = "kafkaListenerContainerFactory")
    public void handleDomainEvent(DomainEvent event) {
        log.debug("Received domain event: {}:{} type={}", event.aggregateType(), event.aggregateId(), event.eventType());

        try {
            JsonNode payload = objectMapper.readTree(event.payload());

            if ("message".equals(event.aggregateType()) && MESSAGE_EVENT_TYPES.contains(event.eventType())) {
                fanoutMessageEvent(event, payload);
            } else if ("chat".equals(event.aggregateType())) {
                fanoutChatEvent(event, payload);
            } else if ("request".equals(event.aggregateType())) {
                fanoutRequestEvent(event, payload);
            } else if ("user".equals(event.aggregateType())) {
                fanoutUserEvent(event, payload);
            } else {
                log.debug("Unknown event type: {}:{}", event.aggregateType(), event.eventType());
            }
        } catch (JsonProcessingException e) {
            log.error("Failed to parse outbox event payload: {}", e.getMessage());
        }
    }

    private void fanoutMessageEvent(DomainEvent event, JsonNode payload) {
        Long chatId = payload.has("chatId") ? payload.get("chatId").asLong() : null;
        if (chatId == null) return;

        if ("MESSAGE_STATUS".equals(event.eventType()) || "MESSAGE_BULK_STATUS".equals(event.eventType())) {
            fanoutMessageStatus(event, payload);
            return;
        }

        fanoutToAllDevices(payload, chatId);
        fanoutChatListUpdate(payload, "message_" + event.eventType().toLowerCase());
    }

    private void fanoutMessageStatus(DomainEvent event, JsonNode payload) {
        if ("MESSAGE_STATUS".equals(event.eventType())) {
            JsonNode senderId = payload.get("senderId");
            if (senderId == null) return;
            Long chatId = payload.has("chatId") ? payload.get("chatId").asLong() : null;
            sendToDeviceTopic(payload, senderId.asLong(), "/status", payload);
        } else if ("MESSAGE_BULK_STATUS".equals(event.eventType())) {
            JsonNode senderIds = payload.get("senderIds");
            if (senderIds != null && senderIds.isArray()) {
                for (JsonNode sid : senderIds) {
                    sendToDeviceTopic(payload, sid.asLong(), "/status", payload);
                }
            }
        }
    }

    private void fanoutToAllDevices(JsonNode payload, Long chatId) {
        if (payload.has("participantDeviceIds")) {
            JsonNode deviceIds = payload.get("participantDeviceIds");
            for (JsonNode deviceIdNode : deviceIds) {
                messagingTemplate.convertAndSend(
                        "/topic/devices/" + deviceIdNode.asText() + "/chats/" + chatId,
                        payload
                );
            }
        }
    }

    private void sendToDeviceTopic(JsonNode payload, Long userId, String topicSuffix, Object body) {
        JsonNode deviceIds = payload.get("participantDeviceIds");
        if (deviceIds != null && deviceIds.isArray()) {
            for (JsonNode deviceIdNode : deviceIds) {
                messagingTemplate.convertAndSend(
                        "/topic/devices/" + deviceIdNode.asText() + topicSuffix,
                        body
                );
            }
        }
    }

    private void fanoutChatEvent(DomainEvent event, JsonNode payload) {
        fanoutChatListUpdate(payload, event.eventType().toLowerCase());
    }

    private void fanoutRequestEvent(DomainEvent event, JsonNode payload) {
        if (payload.has("participantUsernames")) {
            JsonNode usernames = payload.get("participantUsernames");
            var requestEvent = Map.of(
                    "chatId", payload.has("chatId") ? payload.get("chatId").asLong() : null,
                    "reason", event.eventType().toLowerCase(),
                    "eventType", event.eventType()
            );
            for (JsonNode usernameNode : usernames) {
                messagingTemplate.convertAndSend(
                        "/topic/users/" + usernameNode.asText() + "/requests",
                        requestEvent
                );
            }
        }
    }

    private void fanoutUserEvent(DomainEvent event, JsonNode payload) {
        if ("PROFILE_UPDATED".equals(event.eventType())) {
            if (payload.has("participantUsernames")) {
                JsonNode usernames = payload.get("participantUsernames");
                var profileEvent = Map.of(
                        "type", "PROFILE_UPDATED",
                        "userId", payload.has("userId") ? payload.get("userId").asLong() : null
                );
                for (JsonNode usernameNode : usernames) {
                    messagingTemplate.convertAndSend(
                            "/topic/users/" + usernameNode.asText() + "/chats",
                            profileEvent
                    );
                }
            }
        } else if ("USER_STATUS".equals(event.eventType())) {
            String username = payload.has("username") ? payload.get("username").asText() : null;
            if (username != null) {
                messagingTemplate.convertAndSend("/topic/user/status", payload);
            }
        }
    }

    @DltHandler
    public void handleDlt(DomainEvent event) {
        log.error("Event sent to DLT: {}:{} type={}. Payload: {}", event.aggregateType(), event.aggregateId(), event.eventType(), event.payload());
    }

    private void fanoutChatListUpdate(JsonNode payload, String reason) {
        if (payload.has("participantUsernames")) {
            JsonNode usernames = payload.get("participantUsernames");
            var chatListEvent = Map.of(
                    "chatId", payload.has("chatId") ? payload.get("chatId").asLong() : null,
                    "reason", reason,
                    "eventType", reason
            );
            for (JsonNode usernameNode : usernames) {
                messagingTemplate.convertAndSend(
                        "/topic/users/" + usernameNode.asText() + "/chats",
                        chatListEvent
                );
            }
        }
    }
}
