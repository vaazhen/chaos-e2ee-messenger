package ru.messenger.chaosmessenger.message.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class SelfDestructScheduler {

    private final MessageRepository messageRepository;
    private final MessageFanoutService messageFanoutService;
    private final MessageOutboxService messageOutboxService;

    @Scheduled(fixedRate = 30000)
    @Transactional
    public void deleteExpiredMessages() {
        List<Message> expired = messageRepository.findByExpiresAtBeforeAndDeletedAtIsNull(LocalDateTime.now());
        if (expired.isEmpty()) {
            return;
        }

        log.info("Self-destruct: deleting {} expired messages", expired.size());

        LocalDateTime now = LocalDateTime.now();
        expired.forEach(msg -> msg.setDeletedAt(now));
        messageRepository.saveAll(expired);

        Set<Long> affectedChatIds = expired.stream()
                .map(Message::getChatId)
                .collect(Collectors.toSet());

        expired.forEach(messageOutboxService::messageDeleted);
        affectedChatIds.forEach(chatId -> messageOutboxService.chatListUpdated(chatId, "message_deleted"));

        List<Message> expiredCopy = List.copyOf(expired);
        TransactionUtils.afterCommit(() -> {
            expiredCopy.forEach(msg -> {
                try {
                    messageFanoutService.fanoutDeleteEvent(msg);
                } catch (Exception e) {
                    log.error("afterCommit self-destruct fanout failed for message {}", msg.getId(), e);
                }
            });
            affectedChatIds.forEach(chatId -> {
                try {
                    messageFanoutService.notifyChatListUpdated(chatId, "message_deleted");
                } catch (Exception e) {
                    log.error("afterCommit self-destruct fanout failed for chat {}", chatId, e);
                }
            });
        });
    }
}
