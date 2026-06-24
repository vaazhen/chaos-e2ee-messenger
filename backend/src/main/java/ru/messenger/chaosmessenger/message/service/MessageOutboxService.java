package ru.messenger.chaosmessenger.message.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.message.domain.MessageEnvelope;
import ru.messenger.chaosmessenger.message.dto.ReactionEvent;
import ru.messenger.chaosmessenger.outbox.OutboxService;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageOutboxService {

    private final ChatParticipantRepository participantRepository;
    private final UserDeviceRepository userDeviceRepository;
    private final OutboxService outboxService;

    public void messageCreated(Message message, Map<String, MessageEnvelope> byDevice) {
        writeMessageEvent("MESSAGE_CREATED", message, byDevice);
    }

    public void messageEdited(Message message, Map<String, MessageEnvelope> byDevice) {
        writeMessageEvent("MESSAGE_EDITED", message, byDevice);
    }

    public void messageDeleted(Message message) {
        writeMessageEvent("MESSAGE_DELETED", message, Map.of());
    }

    public void messageReaction(Long chatId, ReactionEvent event) {
        Map<String, Object> payload = baseChatPayload(chatId);
        payload.put("type", "MESSAGE_REACTION");
        payload.put("eventType", "MESSAGE_REACTION");
        payload.put("messageId", event.messageId());
        payload.put("actorUserId", event.actorUserId());
        payload.put("actorDeviceId", event.actorDeviceId());
        payload.put("emoji", event.emoji());
        payload.put("active", event.active());
        payload.put("reactions", event.reactions());
        payload.put("timestamp", event.timestamp());
        outboxService.write("message", String.valueOf(chatId), "MESSAGE_REACTION", payload);
    }

    public void messageStatus(Message message, String status) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "MESSAGE_STATUS");
        payload.put("eventType", "MESSAGE_STATUS");
        payload.put("messageId", message.getId());
        payload.put("chatId", message.getChatId());
        payload.put("status", status);
        payload.put("senderId", message.getSenderId());
        payload.put("targetDeviceIds", userDeviceRepository.findByUserIdAndActiveTrue(message.getSenderId())
                .stream()
                .map(UserDevice::getDeviceId)
                .toList());
        outboxService.write("message", String.valueOf(message.getChatId()), "MESSAGE_STATUS", payload);
    }

    public void bulkMessageStatus(Collection<Long> senderIds, Long chatId, String status, Long actorUserId) {
        if (senderIds == null || senderIds.isEmpty()) {
            return;
        }
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "MESSAGE_BULK_STATUS");
        payload.put("eventType", "MESSAGE_BULK_STATUS");
        payload.put("chatId", chatId);
        payload.put("status", status);
        payload.put("actorUserId", actorUserId);
        payload.put("senderIds", senderIds);
        payload.put("targetDeviceIds", userDeviceRepository.findByUserIdInAndActiveTrue(senderIds)
                .stream()
                .map(UserDevice::getDeviceId)
                .toList());
        outboxService.write("message", String.valueOf(chatId), "MESSAGE_BULK_STATUS", payload);
    }

    public void chatListUpdated(Long chatId, String reason) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("chatId", chatId);
        payload.put("eventType", reason.toUpperCase());
        payload.put("reason", reason);
        payload.put("participantUsernames", participantRepository.findDistinctUsernamesByChatId(chatId));
        outboxService.write("chat", String.valueOf(chatId), reason.toUpperCase(), payload);
    }

    private void writeMessageEvent(String eventType, Message message, Map<String, MessageEnvelope> byDevice) {
        Map<String, Object> payload = baseChatPayload(message.getChatId());
        payload.put("type", eventType);
        payload.put("eventType", eventType);
        payload.put("id", message.getId());
        payload.put("messageId", message.getId());
        payload.put("senderId", message.getSenderId());
        payload.put("senderDeviceId", message.getSenderDeviceId());
        payload.put("clientMessageId", message.getClientMessageId());
        payload.put("version", message.getVersion());
        payload.put("createdAt", message.getCreatedAt());
        payload.put("editedAt", message.getEditedAt());
        payload.put("deletedAt", message.getDeletedAt());
        payload.put("status", message.getStatus() == null ? null : message.getStatus().name());
        payload.put("expiresAt", message.getExpiresAt());
        payload.put("reactions", Map.of());
        payload.put("myReactions", List.of());
        payload.put("deviceIds", byDevice.keySet());
        payload.put("envelopes", envelopePayloads(byDevice));
        outboxService.write("message", String.valueOf(message.getChatId()), eventType, payload);
    }

    private Map<String, Object> envelopePayloads(Map<String, MessageEnvelope> byDevice) {
        Map<String, Object> envelopes = new HashMap<>();
        byDevice.forEach((deviceId, envelope) -> envelopes.put(deviceId, envelopePayload(envelope)));
        return envelopes;
    }

    private Map<String, Object> envelopePayload(MessageEnvelope envelope) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("targetDeviceId", envelope.getTargetDeviceId());
        payload.put("messageType", envelope.getMessageType());
        payload.put("senderIdentityPublicKey", envelope.getSenderIdentityPublicKey());
        payload.put("ephemeralPublicKey", envelope.getEphemeralPublicKey());
        payload.put("ciphertext", envelope.getCiphertext());
        payload.put("nonce", envelope.getNonce());
        payload.put("signedPreKeyId", envelope.getSignedPreKeyId());
        payload.put("oneTimePreKeyId", envelope.getOneTimePreKeyId());
        payload.put("messageIndex", envelope.getMessageIndex());
        payload.put("ratchetPublicKey", envelope.getRatchetPublicKey());
        payload.put("previousChainLength", envelope.getPreviousChainLength());
        return payload;
    }

    private Map<String, Object> baseChatPayload(Long chatId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("chatId", chatId);
        payload.put("participantDeviceIds", userDeviceRepository.findActiveByUserIdsWithUser(
                participantRepository.findUserIdsByChatId(chatId)
        ).stream().map(UserDevice::getDeviceId).toList());
        payload.put("participantUsernames", participantRepository.findDistinctUsernamesByChatId(chatId));
        return payload;
    }
}
