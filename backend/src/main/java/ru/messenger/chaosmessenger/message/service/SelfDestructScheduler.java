package ru.messenger.chaosmessenger.message.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.chat.dto.ChatListUpdateEvent;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.message.dto.DeviceMessageEventResponse;
import ru.messenger.chaosmessenger.message.repository.MessageEnvelopeRepository;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class SelfDestructScheduler {

    private final MessageRepository messageRepository;
    private final MessageEnvelopeRepository messageEnvelopeRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ChatParticipantRepository participantRepository;
    private final UserDeviceRepository userDeviceRepository;

    @Scheduled(fixedRate = 30000)
    @Transactional
    public void deleteExpiredMessages() {
        List<Message> expired = messageRepository.findByExpiresAtBeforeAndDeletedAtIsNull(LocalDateTime.now());
        if (expired.isEmpty()) return;

        log.info("Self-destruct: deleting {} expired messages", expired.size());

        for (Message message : expired) {
            message.setDeletedAt(LocalDateTime.now());
            messageRepository.save(message);

            final Message msgFinal = message;
            TransactionUtils.afterCommit(() -> fanoutDeleteEvent(msgFinal));
        }
    }

    private void fanoutDeleteEvent(Message message) {
        List<Long> participantIds = participantRepository.findUserIdsByChatId(message.getChatId());
        if (participantIds.isEmpty()) return;

        DeviceMessageEventResponse event = new DeviceMessageEventResponse(
                "MESSAGE_DELETED",
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
                null,
                Map.of(),
                Set.of(),
                message.getExpiresAt()
        );

        userDeviceRepository.findActiveByUserIdsWithUser(participantIds).forEach(device ->
                messagingTemplate.convertAndSend(
                        "/topic/devices/" + device.getDeviceId() + "/chats/" + message.getChatId(),
                        event
                )
        );

        ChatListUpdateEvent chatEvent = ChatListUpdateEvent.forChat(message.getChatId(), "message_deleted");
        participantRepository.findDistinctUsernamesByChatId(message.getChatId()).forEach(username ->
                messagingTemplate.convertAndSend(
                        "/topic/users/" + username + "/chats",
                        chatEvent
                )
        );
    }
}
