package ru.messenger.chaosmessenger.message.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.common.exception.MessageException;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedEditMessageRequestV2;
import ru.messenger.chaosmessenger.message.access.MessageAccessService;
import ru.messenger.chaosmessenger.message.domain.MessageEnvelope;
import ru.messenger.chaosmessenger.message.dto.DeviceMessageEventResponse;
import ru.messenger.chaosmessenger.message.repository.MessageEnvelopeRepository;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;
import ru.messenger.chaosmessenger.user.domain.User;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageEditService {

    private final MessageRepository messageRepository;
    private final MessageEnvelopeRepository messageEnvelopeRepository;
    private final MessageAccessService messageAccessService;
    private final MessageSendService messageSendService;
    private final MessageFanoutService messageFanoutService;
    private final MessageOutboxService messageOutboxService;

    @Transactional
    public DeviceMessageEventResponse editEncryptedMessageV2(String username, Long messageId, EncryptedEditMessageRequestV2 request) {
        User sender = messageAccessService.requireUser(username);
        UserDevice currentDevice = messageAccessService.requireCurrentDevice();
        Message message = messageRepository.findByIdForUpdate(messageId)
                .orElseThrow(() -> new MessageException("Message not found"));

        messageAccessService.requireParticipant(message.getChatId(), sender.getId());

        if (!Objects.equals(message.getSenderId(), sender.getId())) {
            throw new MessageException("You can only edit your own messages");
        }
        if (message.getDeletedAt() != null) {
            throw new MessageException("Deleted messages cannot be edited");
        }
        if (request.senderDeviceId() == null || !request.senderDeviceId().equals(currentDevice.getDeviceId())) {
            throw new MessageException("senderDeviceId must match current X-Device-Id");
        }

        Map<String, UserDevice> targetDevices = messageSendService.validateEnvelopeTargets(
                message.getChatId(),
                request.envelopes(),
                currentDevice
        );

        message.setVersion(message.getVersion() + 1);
        message.setEditedAt(LocalDateTime.now());
        messageRepository.save(message);
        messageFanoutService.incrementCounter("messages_edited_total");

        messageEnvelopeRepository.deleteByMessageId(messageId);
        messageEnvelopeRepository.flush();

        Map<String, MessageEnvelope> byDevice = messageSendService.persistEnvelopes(message, sender, request.envelopes(), targetDevices);
        messageFanoutService.saveMessageEvent(message, sender.getId(), "EDIT", Map.of("version", message.getVersion()));

        messageOutboxService.messageEdited(message, byDevice);
        messageOutboxService.chatListUpdated(message.getChatId(), "message_edited");

        final Message msgEditFinal = message;
        final Map<String, MessageEnvelope> byDeviceEditFinal = byDevice;
        TransactionUtils.afterCommit(() -> {
            try {
                messageFanoutService.fanoutEditedEvent(msgEditFinal, byDeviceEditFinal);
                messageFanoutService.notifyChatListUpdated(msgEditFinal.getChatId(), "message_edited");
            } catch (Exception e) {
                log.error("afterCommit edit fanout failed for message {}", msgEditFinal.getId(), e);
            }
        });

        return messageFanoutService.toDeviceEvent("MESSAGE_EDITED", message, byDevice.get(currentDevice.getDeviceId()), sender.getId());
    }
}
