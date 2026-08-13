package ru.messenger.chaosmessenger.message.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.common.exception.MessageException;
import ru.messenger.chaosmessenger.infra.presence.OnlineService;
import ru.messenger.chaosmessenger.infra.presence.UnreadService;
import ru.messenger.chaosmessenger.message.domain.MessageEnvelope;
import ru.messenger.chaosmessenger.message.domain.MessageEvent;
import ru.messenger.chaosmessenger.message.domain.MessageReaction;
import ru.messenger.chaosmessenger.message.dto.DeviceMessageEventResponse;
import ru.messenger.chaosmessenger.message.dto.TimelineEnvelopeDto;
import ru.messenger.chaosmessenger.message.repository.MessageEventRepository;
import ru.messenger.chaosmessenger.message.repository.MessageReactionRepository;
import ru.messenger.chaosmessenger.push.service.PushNotificationService;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.repository.UserRepository;

import java.time.LocalDateTime;
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
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final UnreadService unreadService;
    private final OnlineService onlineService;
    private final PushNotificationService pushNotificationService;
    private final UserRepository userRepository;

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

    public void notifyOfflineUsersViaPush(Message message, User sender) {
        List<String> usernames = participantRepository.findDistinctUsernamesByChatId(message.getChatId());
        List<String> targets = usernames.stream()
                .filter(u -> !Objects.equals(u, sender.getUsername()))
                .toList();
        if (targets.isEmpty()) {
            return;
        }

        Map<String, Boolean> onlineStatus = onlineService.isOnlineMany(targets);
        List<String> offlineUsernames = targets.stream()
                .filter(u -> !onlineStatus.getOrDefault(u, false))
                .toList();
        if (offlineUsernames.isEmpty()) {
            return;
        }

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
        try {
            meterRegistry.counter(name).increment();
        } catch (Exception ignored) {
        }
    }

    public void incrementCounter(String name, double amount) {
        try {
            meterRegistry.counter(name).increment(amount);
        } catch (Exception ignored) {
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
        if (userId == null) {
            return Set.of();
        }
        return messageReactionRepository.findByMessageId(messageId)
                .stream()
                .filter(r -> Objects.equals(r.getUserId(), userId))
                .map(MessageReaction::getEmoji)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
