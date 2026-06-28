package ru.messenger.chaosmessenger.message.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.common.exception.MessageException;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.infra.presence.UnreadService;
import ru.messenger.chaosmessenger.message.access.MessageAccessService;
import ru.messenger.chaosmessenger.message.domain.MessageReceipt;
import ru.messenger.chaosmessenger.message.repository.MessageReceiptRepository;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;
import ru.messenger.chaosmessenger.user.domain.User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageReceiptService {

    private final MessageRepository messageRepository;
    private final MessageReceiptRepository messageReceiptRepository;
    private final MessageAccessService messageAccessService;
    private final MessageFanoutService messageFanoutService;
    private final MessageOutboxService messageOutboxService;
    private final UnreadService unreadService;

    @Transactional
    public void markChatAsRead(String username, Long chatId) {
        User user = messageAccessService.requireUser(username);
        UserDevice currentDevice = messageAccessService.requireCurrentDevice();
        String deviceId = messageAccessService.deviceIdOrFallback(currentDevice);

        messageAccessService.requireParticipant(chatId, user.getId());

        List<Long> chatParticipantIds = messageAccessService.participantIds(chatId);
        boolean directOrSavedChat = chatParticipantIds.size() <= 2;
        List<Long> affectedSenderIds = directOrSavedChat
                ? messageRepository.findDistinctSenderIdsByChatIdAndSenderIdNotAndStatusNot(
                chatId,
                user.getId(),
                Message.MessageStatus.READ
        )
                : List.of();

        int receiptRows = messageReceiptRepository.upsertReadForChat(
                chatId,
                user.getId(),
                deviceId,
                LocalDateTime.now()
        );
        messageRepository.recalculateAggregateStatusesForChat(chatId, user.getId());

        messageFanoutService.incrementCounter("messages_read_total", Math.max(receiptRows, 0));
        if (directOrSavedChat) {
            messageOutboxService.bulkMessageStatus(
                    affectedSenderIds,
                    chatId,
                    Message.MessageStatus.READ.name(),
                    user.getId()
            );
        }
        messageOutboxService.chatListUpdated(chatId, "chat_read");

        TransactionUtils.afterCommit(() -> {
            try {
                unreadService.reset(user.getId(), chatId);
                if (directOrSavedChat) {
                    messageFanoutService.sendBulkStatusToSenderDevices(affectedSenderIds, chatId, Message.MessageStatus.READ.name(), user.getId());
                }
                messageFanoutService.notifyChatListUpdated(chatId, "chat_read");
            } catch (Exception e) {
                log.error("afterCommit read fanout failed for chat {}", chatId, e);
            }
        });
    }

    @Transactional
    public void markChatAsDelivered(String username, Long chatId) {
        User user = messageAccessService.requireUser(username);
        UserDevice currentDevice = messageAccessService.requireCurrentDevice();
        String deviceId = messageAccessService.deviceIdOrFallback(currentDevice);

        messageAccessService.requireParticipant(chatId, user.getId());

        List<Long> affectedSenderIds = messageRepository.findDistinctSenderIdsByChatIdAndSenderIdNotAndStatus(
                chatId,
                user.getId(),
                Message.MessageStatus.SENT
        );

        int receiptRows = messageReceiptRepository.upsertDeliveredForChat(
                chatId,
                user.getId(),
                deviceId,
                LocalDateTime.now()
        );
        messageRepository.recalculateAggregateStatusesForChat(chatId, user.getId());

        messageFanoutService.incrementCounter("messages_delivered_total", Math.max(receiptRows, 0));
        messageOutboxService.bulkMessageStatus(
                affectedSenderIds,
                chatId,
                Message.MessageStatus.DELIVERED.name(),
                user.getId()
        );
        messageOutboxService.chatListUpdated(chatId, "chat_delivered");

        TransactionUtils.afterCommit(() -> {
            try {
                messageFanoutService.sendBulkStatusToSenderDevices(affectedSenderIds, chatId, Message.MessageStatus.DELIVERED.name(), user.getId());
                messageFanoutService.notifyChatListUpdated(chatId, "chat_delivered");
            } catch (Exception e) {
                log.error("afterCommit delivered fanout failed for chat {}", chatId, e);
            }
        });
    }

    @Transactional
    public void updateMessageStatus(String username, Long messageId, String status) {
        User user = messageAccessService.requireUser(username);
        UserDevice currentDevice = messageAccessService.requireCurrentDevice();
        String deviceId = messageAccessService.deviceIdOrFallback(currentDevice);

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageException("Message not found"));

        messageAccessService.requireParticipant(message.getChatId(), user.getId());

        if (message.getSenderId().equals(user.getId())) {
            return;
        }

        Message.MessageStatus newStatus = Message.MessageStatus.valueOf(status);

        switch (newStatus) {
            case DELIVERED -> markReceiptDelivered(message, user.getId(), deviceId);
            case READ -> markReceiptRead(message, user.getId(), deviceId);
            case SENT -> {
                return;
            }
        }

        updateAggregateStatus(message);
        String aggregateStatus = message.getStatus().name();
        messageOutboxService.messageStatus(message, aggregateStatus);
        TransactionUtils.afterCommit(() -> {
            try {
                messageFanoutService.sendStatusToSenderDevices(message, aggregateStatus);
            } catch (Exception e) {
                log.error("afterCommit status fanout failed for message {}", message.getId(), e);
            }
        });
    }

    private void updateAggregateStatus(Message message) {
        Message.MessageStatus aggregate = aggregateStatus(message);
        if (message.getStatus() != aggregate) {
            message.setStatus(aggregate);
            messageRepository.save(message);
        }
    }

    private boolean markReceiptDelivered(Message message, Long userId, String deviceId) {
        messageReceiptRepository.upsertDelivered(
                message.getId(),
                message.getChatId(),
                userId,
                deviceId,
                LocalDateTime.now()
        );
        return true;
    }

    private boolean markReceiptRead(Message message, Long userId, String deviceId) {
        messageReceiptRepository.upsertRead(
                message.getId(),
                message.getChatId(),
                userId,
                deviceId,
                LocalDateTime.now()
        );
        return true;
    }

    private Message.MessageStatus aggregateStatus(Message message) {
        List<Long> recipients = messageAccessService.participantIds(message.getChatId())
                .stream()
                .filter(id -> !Objects.equals(id, message.getSenderId()))
                .toList();
        if (recipients.isEmpty()) {
            return Message.MessageStatus.SENT;
        }

        List<MessageReceipt> receipts = messageReceiptRepository.findByMessageId(message.getId());
        java.util.Map<Long, List<MessageReceipt>> byUser =
                receipts.stream().collect(Collectors.groupingBy(MessageReceipt::getUserId));

        boolean allRead = true;
        boolean anyDelivered = false;

        for (Long recipientId : recipients) {
            List<MessageReceipt> userReceipts = byUser.getOrDefault(recipientId, List.of());

            boolean userRead = userReceipts.stream().anyMatch(r -> r.getReadAt() != null);
            boolean userDelivered = userRead || userReceipts.stream().anyMatch(r -> r.getDeliveredAt() != null);

            allRead = allRead && userRead;
            anyDelivered = anyDelivered || userDelivered;
        }

        if (allRead) {
            return Message.MessageStatus.READ;
        }
        if (anyDelivered) {
            return Message.MessageStatus.DELIVERED;
        }
        return Message.MessageStatus.SENT;
    }
}
