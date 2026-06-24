package ru.messenger.chaosmessenger.message.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.common.exception.MessageException;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.message.access.MessageAccessService;
import ru.messenger.chaosmessenger.message.domain.MessageReaction;
import ru.messenger.chaosmessenger.message.dto.ReactionEvent;
import ru.messenger.chaosmessenger.message.repository.MessageReactionRepository;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;
import ru.messenger.chaosmessenger.user.domain.User;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageReactionService {

    private final MessageRepository messageRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final MessageAccessService messageAccessService;
    private final MessageFanoutService messageFanoutService;

    private final Set<String> allowedEmojis = Set.of("👍", "❤️", "😂", "😮", "😢", "🔥");

    @Transactional
    public ReactionEvent toggleReaction(String username, Long messageId, String emoji) {
        User user = messageAccessService.requireUser(username);
        UserDevice currentDevice = messageAccessService.requireCurrentDevice();

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageException("Message not found"));

        messageAccessService.requireParticipant(message.getChatId(), user.getId());

        if (message.getDeletedAt() != null) {
            throw new MessageException("Cannot react to deleted message");
        }

        String cleanEmoji = normalizeEmoji(emoji);

        Optional<MessageReaction> existing =
                messageReactionRepository.findByMessageIdAndUserIdAndEmoji(messageId, user.getId(), cleanEmoji);

        boolean active;

        if (existing.isPresent()) {
            messageReactionRepository.delete(existing.get());
            active = false;
        } else {
            MessageReaction reaction = new MessageReaction();
            reaction.setMessageId(messageId);
            reaction.setChatId(message.getChatId());
            reaction.setUserId(user.getId());
            reaction.setEmoji(cleanEmoji);
            reaction.setCreatedAt(LocalDateTime.now());
            messageReactionRepository.save(reaction);
            active = true;
        }

        Map<String, Long> summary = reactionSummary(messageId);

        ReactionEvent event = new ReactionEvent(
                "MESSAGE_REACTION",
                messageId,
                message.getChatId(),
                user.getId(),
                currentDevice.getDeviceId(),
                cleanEmoji,
                active,
                summary,
                System.currentTimeMillis()
        );

        messageFanoutService.saveMessageEvent(message, user.getId(), "REACTION", Map.of("emoji", cleanEmoji, "active", active));

        TransactionUtils.afterCommit(() -> {
            try {
                messageFanoutService.fanoutReactionEvent(message.getChatId(), event);
            } catch (Exception e) {
                log.error("afterCommit reaction fanout failed for message {}", messageId, e);
            }
        });

        return event;
    }

    public Map<Long, Map<String, Long>> reactionSummaries(Collection<Long> messageIds) {
        if (messageIds == null || messageIds.isEmpty()) {
            return Map.of();
        }
        return messageReactionRepository.findByMessageIdIn(messageIds)
                .stream()
                .collect(Collectors.groupingBy(
                        MessageReaction::getMessageId,
                        Collectors.groupingBy(
                                MessageReaction::getEmoji,
                                LinkedHashMap::new,
                                Collectors.counting()
                        )
                ));
    }

    public Map<Long, Set<String>> myReactionsByMessage(Collection<Long> messageIds, Long userId) {
        if (userId == null || messageIds == null || messageIds.isEmpty()) {
            return Map.of();
        }
        return messageReactionRepository.findByMessageIdIn(messageIds)
                .stream()
                .filter(r -> Objects.equals(r.getUserId(), userId))
                .collect(Collectors.groupingBy(
                        MessageReaction::getMessageId,
                        Collectors.mapping(
                                MessageReaction::getEmoji,
                                Collectors.toCollection(LinkedHashSet::new)
                        )
                ));
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

    public Set<String> myReactions(Long messageId, Long userId) {
        if (userId == null) {
            return Set.of();
        }
        return messageReactionRepository.findByMessageId(messageId)
                .stream()
                .filter(r -> Objects.equals(r.getUserId(), userId))
                .map(MessageReaction::getEmoji)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String normalizeEmoji(String emoji) {
        String value = String.valueOf(emoji == null ? "" : emoji).trim();
        if (!allowedEmojis.contains(value)) {
            throw new IllegalArgumentException("Unsupported reaction emoji: " + value);
        }
        return value;
    }
}
