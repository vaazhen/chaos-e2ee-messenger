package ru.messenger.chaosmessenger.message.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.common.exception.MessageException;
import ru.messenger.chaosmessenger.message.access.MessageAccessService;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;
import ru.messenger.chaosmessenger.user.domain.User;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageDeleteService {

    private final MessageRepository messageRepository;
    private final MessageAccessService messageAccessService;
    private final MessageFanoutService messageFanoutService;
    private final MessageOutboxService messageOutboxService;

    @Transactional
    public void deleteMessage(String username, Long messageId) {
        User user = messageAccessService.requireUser(username);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageException("Message not found"));

        messageAccessService.requireParticipant(message.getChatId(), user.getId());

        if (!Objects.equals(message.getSenderId(), user.getId())) {
            throw new MessageException("You can only delete your own messages");
        }
        if (message.getDeletedAt() != null) {
            return;
        }

        message.setDeletedAt(LocalDateTime.now());
        messageRepository.save(message);
        messageFanoutService.incrementCounter("messages_deleted_total");
        messageFanoutService.saveMessageEvent(message, user.getId(), "DELETE", Map.of());

        messageOutboxService.messageDeleted(message);
        messageOutboxService.chatListUpdated(message.getChatId(), "message_deleted");

        final Message msgDelFinal = message;
        TransactionUtils.afterCommit(() -> {
            try {
                messageFanoutService.fanoutDeleteEvent(msgDelFinal);
                messageFanoutService.notifyChatListUpdated(msgDelFinal.getChatId(), "message_deleted");
            } catch (Exception e) {
                log.error("afterCommit delete fanout failed for message {}", msgDelFinal.getId(), e);
            }
        });
    }
}
