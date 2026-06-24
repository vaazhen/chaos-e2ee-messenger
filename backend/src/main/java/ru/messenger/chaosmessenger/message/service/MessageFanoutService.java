package ru.messenger.chaosmessenger.message.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.chat.dto.ChatListUpdateEvent;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.common.exception.MessageException;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.infra.presence.OnlineService;
import ru.messenger.chaosmessenger.infra.presence.UnreadService;
import ru.messenger.chaosmessenger.message.domain.MessageEnvelope;
import ru.messenger.chaosmessenger.message.domain.MessageEvent;
import ru.messenger.chaosmessenger.message.domain.MessageReaction;
import ru.messenger.chaosmessenger.message.dto.DeviceMessageEventResponse;
import ru.messenger.chaosmessenger.message.dto.ReactionEvent;
import ru.messenger.chaosmessenger.message.dto.TimelineEnvelopeDto;
import ru.messenger.chaosmessenger.message.repository.MessageEnvelopeRepository;
import ru.messenger.chaosmessenger.message.repository.MessageEventRepository;
import ru.messenger.chaosmessenger.message.repository.MessageReactionRepository;
import ru.messenger.chaosmessenger.outbox.OutboxService;
import ru.messenger.chaosmessenger.push.service.PushNotificationService;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.repository.UserRepository;
import ru.messenger.chaosmessenger.user.service.UserIdentityService;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageFanoutService {

    private final MessageEventRepository messageEventRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final ChatParticipantRepository participantRepository;
    private final UserDeviceRepository userDeviceRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final UnreadService unreadService;
    private final OnlineService onlineService;
    private final PushNotificationService pushNotificationService;
    private final UserIdentityService userIdentityService;
    private final UserRepository userRepository;
    private final OutboxService outboxService;

    @Value("${chaos.kafka.enabled:false}")
    private boolean kafkaEnabled;

    private record StatusBulkUpdateEvent(String type, Long chatId, String status, Long actorUserId) {}
    private record StatusUpdateEvent(Long messageId, String status) {}

    public void fanoutCreatedEvent(Message message, Map<String, MessageEnvelope> byDevice) {
        if (!kafkaEnabled) {
            byDevice.forEach((deviceId, envelope) -> messagingTemplate.convertAndSend(
                    "/topic/devices/" + deviceId + "/chats/" + message.getChatId(),
                    toDeviceEvent("MESSAGE_CREATED", message, envelope, Map.of(), Set.of())
            ));
        }
        writeOutboxEvent("message", String.valueOf(message.getChatId()), "MESSAGE_CREATED", message, byDevice);
    }

    public void fanoutEditedEvent(Message message, Map<String, MessageEnvelope> byDevice) {
        if (!kafkaEnabled) {
            byDevice.forEach((deviceId, envelope) -> messagingTemplate.convertAndSend(
                    "/topic/devices/" + deviceId + "/chats/" + message.getChatId(),
                    toDeviceEvent("MESSAGE_EDITED", message, envelope, envelope.getTargetUserId())
            ));
        }
        writeOutboxEvent("message", String.valueOf(message.getChatId()), "MESSAGE_EDITED", message, byDevice);
    }

    public void fanoutDeleteEvent(Message message) {
        if (!kafkaEnabled) {
            List<Long> participants = participantRepository.findUserIdsByChatId(message.getChatId()).stream()
                    .distinct()
                    .toList();
            if (!participants.isEmpty()) {
                userDeviceRepository.findActiveByUserIdsWithUser(participants).forEach(device ->
                        messagingTemplate.convertAndSend(
                                "/topic/devices/" + device.getDeviceId() + "/chats/" + message.getChatId(),
                                toDeviceEvent("MESSAGE_DELETED", message, null, device.getUser().getId())
                        )
                );
            }
        }
        writeOutboxEvent("message", String.valueOf(message.getChatId()), "MESSAGE_DELETED", message, Map.of());
    }

    public void fanoutReactionEvent(Long chatId, ReactionEvent event) {
        if (!kafkaEnabled) {
            List<Long> participants = participantRepository.findUserIdsByChatId(chatId).stream()
                    .distinct()
                    .toList();
            if (!participants.isEmpty()) {
                userDeviceRepository.findByUserIdInAndActiveTrue(participants).forEach(device ->
                        messagingTemplate.convertAndSend(
                                "/topic/devices/" + device.getDeviceId() + "/chats/" + chatId,
                                event
                        )
                );
            }
        }
        notifyChatListUpdated(chatId, "message_reaction");
        writeOutboxEvent("message", String.valueOf(chatId), "MESSAGE_REACTION", event, Map.of());
    }

    public void sendStatusToSenderDevices(Message message, String status) {
        if (!kafkaEnabled) {
            for (UserDevice device : userDeviceRepository.findByUserIdAndActiveTrue(message.getSenderId())) {
                messagingTemplate.convertAndSend(
                        "/topic/devices/" + device.getDeviceId() + "/status",
                        new StatusUpdateEvent(message.getId(), status)
                );
            }
        }
        var payload = Map.of(
                "messageId", message.getId(),
                "chatId", message.getChatId(),
                "status", status,
                "senderId", message.getSenderId()
        );
        outboxService.write("message", String.valueOf(message.getChatId()), "MESSAGE_STATUS", payload);
    }

    public void sendBulkStatusToSenderDevices(Collection<Long> senderIds, Long chatId, String status, Long actorUserId) {
        if (senderIds == null || senderIds.isEmpty()) return;

        if (!kafkaEnabled) {
            StatusBulkUpdateEvent event = new StatusBulkUpdateEvent("delivery_bulk", chatId, status, actorUserId);
            userDeviceRepository.findByUserIdInAndActiveTrue(senderIds).forEach(device ->
                    messagingTemplate.convertAndSend(
                            "/topic/devices/" + device.getDeviceId() + "/status",
                            event
                    )
            );
        }
        var payload = Map.of(
                "chatId", chatId,
                "status", status,
                "actorUserId", actorUserId,
                "senderIds", senderIds
        );
        outboxService.write("message", String.valueOf(chatId), "MESSAGE_BULK_STATUS", payload);
    }

    public void saveMessageEvent(Message message, Long actorUserId, String eventType, Map<String, Object> payload) {
        try {
            MessageEvent event = new MessageEvent();
            event.setMessageId(message.getId());
            event.setChatId(message.getChatId());
            event.setActorUserId(actorUserId);
            event.setEventType(eventType);
            event.setPayloadJson(objectMapper.writeValueAsString(payload));
            event.setCreatedAt(LocalDateTime.now());
            messageEventRepository.save(event);
            incrementCounter("message_events_total");
        } catch (Exception e) {
            throw new MessageException("Failed to persist message event", e);
        }
    }

    public void notifyChatListUpdated(Long chatId, String reason) {
        if (!kafkaEnabled) {
            ChatListUpdateEvent payload = ChatListUpdateEvent.forChat(chatId, reason);
            participantRepository.findDistinctUsernamesByChatId(chatId).forEach(username ->
                    messagingTemplate.convertAndSend("/topic/users/" + username + "/chats", payload)
            );
        }
        writeOutboxEvent("chat", String.valueOf(chatId), reason.toUpperCase(), Map.of("chatId", chatId, "reason", reason), Map.of());
    }

    public void notifyOfflineUsersViaPush(Message message, User sender) {
        List<String> usernames = participantRepository.findDistinctUsernamesByChatId(message.getChatId());
        List<String> targets = usernames.stream()
                .filter(u -> !Objects.equals(u, sender.getUsername()))
                .toList();
        if (targets.isEmpty()) return;

        Map<String, Boolean> onlineStatus = onlineService.isOnlineMany(targets);
        List<String> offlineUsernames = targets.stream()
                .filter(u -> !onlineStatus.getOrDefault(u, false))
                .toList();
        if (offlineUsernames.isEmpty()) return;

        Map<String, User> usersByUsername = userRepository.findByUsernameIn(offlineUsernames)
                .stream()
                .collect(Collectors.toMap(User::getUsername, u -> u, (a, b) -> a));

        offlineUsernames.forEach(username -> {
            User user = usersByUsername.get(username);
            if (user != null) {
                pushNotificationService.sendPushToUser(
                        user.getId(),
                        sender.getDisplayName(),
                        "New encrypted message",
                        "chat-" + message.getChatId(),
                        String.valueOf(message.getChatId())
                );
            }
        });
    }

    public void incrementUnreadForOthers(Long chatId, Long senderId) {
        List<Long> userIds = participantRepository.findUserIdsByChatId(chatId);
        userIds.stream()
                .filter(userId -> !Objects.equals(userId, senderId))
                .forEach(userId -> unreadService.increment(userId, chatId));
    }

    public String deviceKey(Long userId, String deviceId) {
        return userId + ":" + deviceId;
    }

    public DeviceMessageEventResponse toDeviceEvent(String type, Message message, MessageEnvelope envelope, Long viewerUserId) {
        return toDeviceEvent(type, message, envelope, reactionSummary(message.getId()), myReactions(message.getId(), viewerUserId));
    }

    public DeviceMessageEventResponse toDeviceEvent(
            String type,
            Message message,
            MessageEnvelope envelope,
            Map<String, Long> reactions,
            Set<String> myReactions
    ) {
        return new DeviceMessageEventResponse(
                type,
                message.getId(),
                message.getChatId(),
                message.getSenderId(),
                message.getSenderDeviceId(),
                message.getClientMessageId(),
                message.getVersion(),
                message.getCreatedAt(),
                message.getEditedAt(),
                message.getDeletedAt(),
                message.getStatus().name(),
                envelope == null ? null : toEnvelopeDto(envelope),
                reactions,
                myReactions,
                message.getExpiresAt()
        );
    }

    public TimelineEnvelopeDto toEnvelopeDto(MessageEnvelope envelope) {
        return new TimelineEnvelopeDto(
                envelope.getTargetDeviceId(),
                envelope.getMessageType(),
                envelope.getSenderIdentityPublicKey(),
                envelope.getEphemeralPublicKey(),
                envelope.getCiphertext(),
                envelope.getNonce(),
                envelope.getSignedPreKeyId(),
                envelope.getOneTimePreKeyId(),
                envelope.getMessageIndex(),
                envelope.getRatchetPublicKey(),
                envelope.getPreviousChainLength()
        );
    }

    public void incrementCounter(String name) {
        try { meterRegistry.counter(name).increment(); } catch (Exception ignored) {}
    }

    public void incrementCounter(String name, double amount) {
        try { meterRegistry.counter(name).increment(amount); } catch (Exception ignored) {}
    }

    private void writeOutboxEvent(String aggregateType, String aggregateId, String eventType, Object mainPayload, Map<String, MessageEnvelope> byDevice) {
        try {
            var payload = new HashMap<String, Object>();
            if (mainPayload instanceof Message message) {
                payload.put("chatId", message.getChatId());
                payload.put("messageId", message.getId());
                payload.put("senderId", message.getSenderId());
                payload.put("senderDeviceId", message.getSenderDeviceId());
                payload.put("deviceIds", byDevice.keySet());
                payload.put("participantDeviceIds", userDeviceRepository.findActiveByUserIdsWithUser(
                        participantRepository.findUserIdsByChatId(message.getChatId())
                ).stream().map(UserDevice::getDeviceId).toList());
                payload.put("participantUsernames", participantRepository.findDistinctUsernamesByChatId(message.getChatId()));
            } else if (mainPayload instanceof ReactionEvent re) {
                payload.put("chatId", re.chatId());
                payload.put("messageId", re.messageId());
                payload.put("participantDeviceIds", userDeviceRepository.findActiveByUserIdsWithUser(
                        participantRepository.findUserIdsByChatId(re.chatId())
                ).stream().map(UserDevice::getDeviceId).toList());
                payload.put("participantUsernames", participantRepository.findDistinctUsernamesByChatId(re.chatId()));
            } else if (mainPayload instanceof Map<?, ?> map && !map.containsKey("participantUsernames")) {
                payload.putAll((Map<String, Object>) map);
            }
            outboxService.write(aggregateType, aggregateId, eventType, payload);
        } catch (Exception e) {
            log.warn("Failed to write outbox event for {}:{} type={}", aggregateType, aggregateId, eventType, e);
        }
    }

    private Map<String, Long> reactionSummary(Long messageId) {
        return messageReactionRepository.findByMessageId(messageId)
                .stream()
                .collect(Collectors.groupingBy(
                        MessageReaction::getEmoji,
                        LinkedHashMap::new,
                        Collectors.counting()
                ));
    }

    private Set<String> myReactions(Long messageId, Long userId) {
        if (userId == null) return Set.of();
        return messageReactionRepository.findByMessageId(messageId)
                .stream()
                .filter(r -> Objects.equals(r.getUserId(), userId))
                .map(MessageReaction::getEmoji)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
