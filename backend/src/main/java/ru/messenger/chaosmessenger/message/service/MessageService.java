package ru.messenger.chaosmessenger.message.service;


import ru.messenger.chaosmessenger.user.service.UserIdentityService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.chat.domain.Chat;
import ru.messenger.chaosmessenger.chat.domain.GroupPolicy;
import ru.messenger.chaosmessenger.chat.dto.ChatListUpdateEvent;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.chat.repository.ChatRepository;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.common.exception.AuthException;
import ru.messenger.chaosmessenger.common.exception.ChatException;
import ru.messenger.chaosmessenger.common.exception.MessageException;
import ru.messenger.chaosmessenger.crypto.device.CurrentDeviceService;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedEditMessageRequestV2;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedMessageEnvelopeInput;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedSendMessageRequestV2;
import ru.messenger.chaosmessenger.infra.presence.UnreadService;
import ru.messenger.chaosmessenger.message.domain.MessageEnvelope;
import ru.messenger.chaosmessenger.message.domain.MessageEvent;
import ru.messenger.chaosmessenger.message.domain.MessageReaction;
import ru.messenger.chaosmessenger.message.domain.MessageReceipt;
import ru.messenger.chaosmessenger.message.dto.DeviceMessageEventResponse;
import ru.messenger.chaosmessenger.message.dto.MessageTimelineItemResponse;
import ru.messenger.chaosmessenger.message.dto.ReactionEvent;
import ru.messenger.chaosmessenger.message.dto.TimelineEnvelopeDto;
import ru.messenger.chaosmessenger.message.repository.MessageEnvelopeRepository;
import ru.messenger.chaosmessenger.message.repository.MessageEventRepository;
import ru.messenger.chaosmessenger.message.repository.MessageReactionRepository;
import ru.messenger.chaosmessenger.message.repository.MessageReceiptRepository;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;
import ru.messenger.chaosmessenger.user.domain.User;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final MessageEnvelopeRepository messageEnvelopeRepository;
    private final MessageEventRepository messageEventRepository;
    private final MessageReceiptRepository messageReceiptRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final ChatParticipantRepository participantRepository;
    private final ChatRepository chatRepository;
    private final UserIdentityService userIdentityService;
    private final UserDeviceRepository userDeviceRepository;
    private final CurrentDeviceService currentDeviceService;
    private final UnreadService unreadService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    @Transactional
    public DeviceMessageEventResponse sendEncryptedMessageV2(String username, EncryptedSendMessageRequestV2 request) {
        User sender = requireUser(username);
        UserDevice currentDevice = currentDeviceService.requireCurrentDevice();
        validateBasicSendRequest(sender, currentDevice, request);

        Optional<Message> existing = messageRepository.findBySenderIdAndSenderDeviceIdAndClientMessageId(
                sender.getId(),
                currentDevice.getDeviceId(),
                request.clientMessageId()
        );
        if (existing.isPresent()) {
            return buildIdempotentSendResponse(existing.get(), request, currentDevice, sender.getId());
        }

        Map<String, UserDevice> targetDevices = validateEnvelopeTargets(
                request.chatId(),
                request.envelopes(),
                currentDevice
        );

        Message message = new Message();
        message.setChatId(request.chatId());
        message.setSenderId(sender.getId());
        message.setSenderDeviceId(currentDevice.getDeviceId());
        message.setClientMessageId(request.clientMessageId());
        message.setContent("[encrypted]");
        message.setCreatedAt(LocalDateTime.now());
        message.setStatus(Message.MessageStatus.SENT);
        try {
            message = messageRepository.save(message);
            messageRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            Message existingAfterRace = messageRepository.findBySenderIdAndSenderDeviceIdAndClientMessageId(
                            sender.getId(),
                            currentDevice.getDeviceId(),
                            request.clientMessageId()
                    )
                    .orElseThrow(() -> ex);
            return buildIdempotentSendResponse(existingAfterRace, request, currentDevice, sender.getId());
        }

        incrementCounter("messages_sent_total");

        Map<String, MessageEnvelope> byDevice = persistEnvelopes(message, sender, request.envelopes(), targetDevices);

        final Message msgFinal = message;
        final Map<String, MessageEnvelope> byDeviceFinal = byDevice;
        final Chat chat = chatRepository.findById(request.chatId()).orElse(null);
        TransactionUtils.afterCommit(() -> {
            incrementUnreadForOthers(msgFinal.getChatId(), sender.getId());
            fanoutCreatedEvent(msgFinal, byDeviceFinal);
            notifyChatListUpdated(msgFinal.getChatId(), "message_created");
            if (chat != null
                    && "DIRECT".equals(chat.getType())
                    && "PENDING".equalsIgnoreCase(String.valueOf(chat.getDirectStatus()))) {
                ChatListUpdateEvent requestEvent = ChatListUpdateEvent.forChat(msgFinal.getChatId(), "request_message");
                participantRepository.findDistinctUsernamesByChatId(msgFinal.getChatId()).forEach(participantUsername -> {
                    if (!Objects.equals(participantUsername, sender.getUsername())) {
                        messagingTemplate.convertAndSend(
                                "/topic/users/" + participantUsername + "/requests",
                                requestEvent
                        );
                    }
                });
            }
        });

        return toDeviceEvent("MESSAGE_CREATED", message, byDevice.get(currentDevice.getDeviceId()), sender.getId());
    }

    @Transactional
    public DeviceMessageEventResponse editEncryptedMessageV2(String username, Long messageId, EncryptedEditMessageRequestV2 request) {
        User sender = requireUser(username);
        UserDevice currentDevice = currentDeviceService.requireCurrentDevice();
        Message message = messageRepository.findByIdForUpdate(messageId)
                .orElseThrow(() -> new MessageException("Message not found"));

        requireParticipant(message.getChatId(), sender.getId());

        if (!Objects.equals(message.getSenderId(), sender.getId())) {
            throw new MessageException("You can only edit your own messages");
        }
        if (message.getDeletedAt() != null) {
            throw new MessageException("Deleted messages cannot be edited");
        }
        if (request.senderDeviceId() == null || !request.senderDeviceId().equals(currentDevice.getDeviceId())) {
            throw new MessageException("senderDeviceId must match current X-Device-Id");
        }

        Map<String, UserDevice> targetDevices = validateEnvelopeTargets(
                message.getChatId(),
                request.envelopes(),
                currentDevice
        );

        message.setVersion(message.getVersion() + 1);
        message.setEditedAt(LocalDateTime.now());
        messageRepository.save(message);
        incrementCounter("messages_edited_total");

        messageEnvelopeRepository.deleteByMessageId(messageId);
        messageEnvelopeRepository.flush();

        Map<String, MessageEnvelope> byDevice = persistEnvelopes(message, sender, request.envelopes(), targetDevices);
        saveMessageEvent(message, sender.getId(), "EDIT", Map.of("version", message.getVersion()));

        final Message msgEditFinal = message;
        final Map<String, MessageEnvelope> byDeviceEditFinal = byDevice;
        TransactionUtils.afterCommit(() -> {
            fanoutEditedEvent(msgEditFinal, byDeviceEditFinal);
            notifyChatListUpdated(msgEditFinal.getChatId(), "message_edited");
        });

        return toDeviceEvent("MESSAGE_EDITED", message, byDevice.get(currentDevice.getDeviceId()), sender.getId());
    }

    @Transactional(readOnly = true)
    public List<MessageTimelineItemResponse> getChatTimeline(String username, Long chatId, Long beforeMessageId, int limit) {
        User user = requireUser(username);
        UserDevice currentDevice = currentDeviceService.requireCurrentDevice();
        requireParticipant(chatId, user.getId());

        PageRequest pageable = PageRequest.of(0, Math.max(1, Math.min(limit, 200)));
        List<Message> messages = messageRepository.findByChatIdBefore(chatId, beforeMessageId, pageable);
        Collections.reverse(messages);

        List<Long> messageIds = messages.stream().map(Message::getId).toList();

        List<MessageEnvelope> envelopes = messageIds.isEmpty()
                ? List.of()
                : messageEnvelopeRepository.findByMessageIdInAndTargetDeviceId(messageIds, currentDevice.getDeviceId());

        Map<Long, MessageEnvelope> envelopeByMessageId = envelopes.stream()
                .collect(Collectors.toMap(MessageEnvelope::getMessageId, Function.identity()));

        Map<Long, Map<String, Long>> reactionSummaryByMessageId = reactionSummaries(messageIds);
        Map<Long, Set<String>> myReactionsByMessageId = myReactionsByMessage(messageIds, user.getId());

        List<MessageTimelineItemResponse> result = new ArrayList<>();
        for (Message message : messages) {
            result.add(toTimelineItem(
                    message,
                    envelopeByMessageId.get(message.getId()),
                    reactionSummaryByMessageId.getOrDefault(message.getId(), Map.of()),
                    myReactionsByMessageId.getOrDefault(message.getId(), Set.of())
            ));
        }
        return result;
    }

    @Transactional
    public void deleteMessage(String username, Long messageId) {
        User user = requireUser(username);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageException("Message not found"));

        requireParticipant(message.getChatId(), user.getId());

        if (!Objects.equals(message.getSenderId(), user.getId())) {
            throw new MessageException("You can only delete your own messages");
        }
        if (message.getDeletedAt() != null) {
            return;
        }

        message.setDeletedAt(LocalDateTime.now());
        messageRepository.save(message);
        incrementCounter("messages_deleted_total");
        saveMessageEvent(message, user.getId(), "DELETE", Map.of());

        final Message msgDelFinal = message;
        TransactionUtils.afterCommit(() -> {
            fanoutDeleteEvent(msgDelFinal);
            notifyChatListUpdated(msgDelFinal.getChatId(), "message_deleted");
        });
    }

    @Transactional
    public void markChatAsRead(String username, Long chatId) {
        User user = requireUser(username);
        UserDevice currentDevice = currentDeviceOrNull();
        String deviceId = deviceIdOrFallback(currentDevice);

        requireParticipant(chatId, user.getId());

        List<Long> chatParticipantIds = participantIds(chatId);
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

        incrementCounter("messages_read_total", Math.max(receiptRows, 0));

        TransactionUtils.afterCommit(() -> {
            unreadService.reset(user.getId(), chatId);
            if (directOrSavedChat) {
                sendBulkStatusToSenderDevices(affectedSenderIds, chatId, Message.MessageStatus.READ.name(), user.getId());
            }
            notifyChatListUpdated(chatId, "chat_read");
        });
    }

    @Transactional
    public void markChatAsDelivered(String username, Long chatId) {
        User user = requireUser(username);
        UserDevice currentDevice = currentDeviceOrNull();
        String deviceId = deviceIdOrFallback(currentDevice);

        requireParticipant(chatId, user.getId());

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

        incrementCounter("messages_delivered_total", Math.max(receiptRows, 0));

        TransactionUtils.afterCommit(() -> {
            sendBulkStatusToSenderDevices(affectedSenderIds, chatId, Message.MessageStatus.DELIVERED.name(), user.getId());
            notifyChatListUpdated(chatId, "chat_delivered");
        });
    }

    @Transactional
    public void updateMessageStatus(String username, Long messageId, String status) {
        User user = requireUser(username);
        UserDevice currentDevice = currentDeviceOrNull();
        String deviceId = deviceIdOrFallback(currentDevice);

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageException("Message not found"));

        requireParticipant(message.getChatId(), user.getId());

        if (message.getSenderId().equals(user.getId())) {
            return;
        }

        Message.MessageStatus newStatus = Message.MessageStatus.valueOf(status);

        switch (newStatus) {
            case DELIVERED -> markReceiptDelivered(message, user.getId(), deviceId);
            case READ -> markReceiptRead(message, user.getId(), deviceId);
            case SENT -> { return; }
        }

        updateAggregateStatus(message);
        String aggregateStatus = message.getStatus().name();
        TransactionUtils.afterCommit(() -> sendStatusToSenderDevices(message, aggregateStatus));
    }

    @Transactional
    public ReactionEvent toggleReaction(String username, Long messageId, String emoji) {
        User user = requireUser(username);
        UserDevice currentDevice = currentDeviceService.requireCurrentDevice();

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageException("Message not found"));

        requireParticipant(message.getChatId(), user.getId());

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

        saveMessageEvent(message, user.getId(), "REACTION", Map.of("emoji", cleanEmoji, "active", active));

        TransactionUtils.afterCommit(() -> fanoutReactionEvent(message.getChatId(), event));

        return event;
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
        List<Long> recipients = participantIds(message.getChatId())
                .stream()
                .filter(id -> !Objects.equals(id, message.getSenderId()))
                .toList();

        if (recipients.isEmpty()) {
            return Message.MessageStatus.SENT;
        }

        List<MessageReceipt> receipts = messageReceiptRepository.findByMessageId(message.getId());
        Map<Long, List<MessageReceipt>> byUser =
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

        if (allRead) return Message.MessageStatus.READ;
        if (anyDelivered) return Message.MessageStatus.DELIVERED;
        return Message.MessageStatus.SENT;
    }

    private void validateBasicSendRequest(User sender, UserDevice currentDevice, EncryptedSendMessageRequestV2 request) {
        if (request == null || request.chatId() == null) {
            throw new IllegalArgumentException("chatId is required");
        }
        if (request.clientMessageId() == null || request.clientMessageId().isBlank()) {
            throw new IllegalArgumentException("clientMessageId is required");
        }
        if (request.senderDeviceId() == null || !request.senderDeviceId().equals(currentDevice.getDeviceId())) {
            throw new MessageException("senderDeviceId must match current X-Device-Id");
        }

        requireParticipant(request.chatId(), sender.getId());

        // Instagram-style message requests: recipient cannot send until accepted.
        Chat chat = chatRepository.findById(request.chatId()).orElse(null);
        if (chat != null && "DIRECT".equals(chat.getType())) {
            String st = String.valueOf(chat.getDirectStatus());
            if ("PENDING".equalsIgnoreCase(st)) {
                Long requestedBy = chat.getDirectRequestedBy();
                if (requestedBy != null && !requestedBy.equals(sender.getId())) {
                    throw new MessageException("Chat request not accepted");
                }
                if (requestedBy != null && requestedBy.equals(sender.getId())) {
                    long senderMessages = messageRepository.countByChatIdAndSenderIdAndDeletedAtIsNull(
                            request.chatId(),
                            sender.getId()
                    );
                    if (senderMessages >= 1) {
                        throw new MessageException("Only one message is allowed until request is accepted");
                    }
                }
            }
            if ("DECLINED".equalsIgnoreCase(st)) {
                throw new MessageException("Chat request was declined");
            }
        }
        if (chat != null && "GROUP".equals(chat.getType())) {
            var participant = participantRepository.findByChatIdAndUserId(request.chatId(), sender.getId())
                    .orElseThrow(() -> new ChatException("You are not a participant of this chat"));
            if (participant.isBanned()) {
                throw new MessageException("You are banned in this group");
            }
            if (participant.isMutedNow()) {
                throw new MessageException("You are muted in this group");
            }
            GroupPolicy policy = GroupPolicy.fromString(chat.getWhoCanWrite(), GroupPolicy.ALL);
            if (policy != GroupPolicy.ALL && policy != GroupPolicy.ANYONE) {
                if (!participant.groupRole().atLeast(policy.minRole())) {
                    throw new MessageException("You cannot write to this group");
                }
            }
        }
    }

    private DeviceMessageEventResponse buildIdempotentSendResponse(
            Message existingMessage,
            EncryptedSendMessageRequestV2 request,
            UserDevice currentDevice,
            Long senderUserId
    ) {
        boolean sameMessage = Objects.equals(existingMessage.getChatId(), request.chatId())
                && Objects.equals(existingMessage.getSenderDeviceId(), currentDevice.getDeviceId());
        if (!sameMessage) {
            throw new MessageException("clientMessageId already belongs to another message");
        }

        MessageEnvelope currentEnvelope = messageEnvelopeRepository
                .findByMessageIdAndTargetDeviceId(existingMessage.getId(), currentDevice.getDeviceId())
                .orElse(null);
        return toDeviceEvent("MESSAGE_CREATED", existingMessage, currentEnvelope, senderUserId);
    }

    private Map<String, UserDevice> validateEnvelopeTargets(
            Long chatId,
            List<EncryptedMessageEnvelopeInput> envelopes,
            UserDevice currentDevice
    ) {
        if (envelopes == null || envelopes.isEmpty()) {
            throw new IllegalArgumentException("envelopes are required");
        }

        Set<String> targetIds = new HashSet<>();
        Set<Long> participantUserIds = participantIds(chatId).stream().collect(Collectors.toSet());
        Map<String, EncryptedMessageEnvelopeInput> envelopesByTarget = new HashMap<>();

        for (EncryptedMessageEnvelopeInput envelope : envelopes) {
            if (envelope.targetDeviceId() == null || envelope.targetDeviceId().isBlank()) {
                throw new IllegalArgumentException("targetDeviceId is required");
            }
            String targetKey = deviceKey(envelope.targetUserId(), envelope.targetDeviceId());
            if (!targetIds.add(targetKey)) {
                throw new IllegalArgumentException("Duplicate targetDeviceId: " + envelope.targetDeviceId());
            }
            if (envelope.targetUserId() == null || !participantUserIds.contains(envelope.targetUserId())) {
                throw new IllegalArgumentException("Envelope targetUserId is not a chat participant");
            }
            if (envelope.ciphertext() == null || envelope.ciphertext().isBlank()
                    || envelope.nonce() == null || envelope.nonce().isBlank()) {
                throw new IllegalArgumentException("ciphertext and nonce are required");
            }
            if (envelope.messageType() == null || envelope.messageType().isBlank()) {
                throw new IllegalArgumentException("messageType is required");
            }
            if (envelope.senderIdentityPublicKey() == null || envelope.senderIdentityPublicKey().isBlank()) {
                throw new IllegalArgumentException("senderIdentityPublicKey is required");
            }
            if (currentDevice.getIdentityPublicKey() != null
                    && !currentDevice.getIdentityPublicKey().isBlank()
                    && !Objects.equals(envelope.senderIdentityPublicKey(), currentDevice.getIdentityPublicKey())) {
                throw new IllegalArgumentException("senderIdentityPublicKey must match current device identity");
            }
            envelopesByTarget.put(targetKey, envelope);
        }

        Map<String, UserDevice> activeDevicesByTarget = participantUserIds.isEmpty()
                ? Map.of()
                : userDeviceRepository.findActiveByUserIdsWithUser(participantUserIds)
                        .stream()
                        .collect(Collectors.toMap(
                                device -> deviceKey(device.getUser().getId(), device.getDeviceId()),
                                Function.identity(),
                                (left, right) -> left
                        ));

        if (!activeDevicesByTarget.keySet().equals(envelopesByTarget.keySet())) {
            throw new IllegalArgumentException("Envelope target set does not match active chat devices");
        }

        return activeDevicesByTarget;
    }

    private Map<String, MessageEnvelope> persistEnvelopes(
            Message message,
            User sender,
            List<EncryptedMessageEnvelopeInput> inputs,
            Map<String, UserDevice> activeDevicesByTarget
    ) {
        Map<String, MessageEnvelope> byDevice = new HashMap<>();

        for (EncryptedMessageEnvelopeInput input : inputs) {
            UserDevice targetDevice = activeDevicesByTarget.get(deviceKey(input.targetUserId(), input.targetDeviceId()));
            if (targetDevice == null) {
                throw new IllegalArgumentException("Target device not found: " + input.targetDeviceId());
            }

            MessageEnvelope entity = new MessageEnvelope();
            entity.setMessageId(message.getId());
            entity.setChatId(message.getChatId());
            entity.setTargetUserId(input.targetUserId());
            entity.setTargetDeviceDbId(targetDevice.getId());
            entity.setTargetDeviceId(targetDevice.getDeviceId());
            entity.setSenderUserId(sender.getId());
            entity.setSenderDeviceId(message.getSenderDeviceId());
            entity.setMessageType(input.messageType());
            entity.setSenderIdentityPublicKey(input.senderIdentityPublicKey());
            entity.setEphemeralPublicKey(input.ephemeralPublicKey());
            entity.setCiphertext(input.ciphertext());
            entity.setNonce(input.nonce());
            entity.setSignedPreKeyId(input.signedPreKeyId());
            entity.setOneTimePreKeyId(input.oneTimePreKeyId());
            entity.setMessageIndex(input.messageIndex());
            entity.setRatchetPublicKey(input.ratchetPublicKey());
            entity.setPreviousChainLength(input.previousChainLength());
            entity.setCreatedAt(LocalDateTime.now());

            entity = messageEnvelopeRepository.save(entity);
            incrementCounter("message_envelopes_persisted_total");
            byDevice.put(entity.getTargetDeviceId(), entity);
        }

        return byDevice;
    }

    private String deviceKey(Long userId, String deviceId) {
        return userId + ":" + deviceId;
    }

    private void fanoutCreatedEvent(Message message, Map<String, MessageEnvelope> byDevice) {
        byDevice.forEach((deviceId, envelope) -> messagingTemplate.convertAndSend(
                "/topic/devices/" + deviceId + "/chats/" + message.getChatId(),
                toDeviceEvent(
                        "MESSAGE_CREATED",
                        message,
                        envelope,
                        Map.of(),
                        Set.of()
                )
        ));
    }

    private void fanoutEditedEvent(Message message, Map<String, MessageEnvelope> byDevice) {
        byDevice.forEach((deviceId, envelope) -> messagingTemplate.convertAndSend(
                "/topic/devices/" + deviceId + "/chats/" + message.getChatId(),
                toDeviceEvent("MESSAGE_EDITED", message, envelope, envelope.getTargetUserId())
        ));
    }

    private void fanoutDeleteEvent(Message message) {
        List<Long> participants = participantIds(message.getChatId());
        if (participants.isEmpty()) {
            return;
        }

        userDeviceRepository.findActiveByUserIdsWithUser(participants).forEach(device ->
                messagingTemplate.convertAndSend(
                        "/topic/devices/" + device.getDeviceId() + "/chats/" + message.getChatId(),
                        toDeviceEvent("MESSAGE_DELETED", message, null, device.getUser().getId())
                )
        );
    }

    private void fanoutReactionEvent(Long chatId, ReactionEvent event) {
        List<Long> participants = participantIds(chatId);
        if (!participants.isEmpty()) {
            userDeviceRepository.findByUserIdInAndActiveTrue(participants).forEach(device ->
                    messagingTemplate.convertAndSend(
                            "/topic/devices/" + device.getDeviceId() + "/chats/" + chatId,
                            event
                    )
            );
        }

        notifyChatListUpdated(chatId, "message_reaction");
    }

    private void sendStatusToSenderDevices(Message message, String status) {
        for (UserDevice device : userDeviceRepository.findByUserIdAndActiveTrue(message.getSenderId())) {
            messagingTemplate.convertAndSend(
                    "/topic/devices/" + device.getDeviceId() + "/status",
                    new StatusUpdateEvent(message.getId(), status)
            );
        }
    }

    private void sendBulkStatusToSenderDevices(Collection<Long> senderIds, Long chatId, String status, Long actorUserId) {
        if (senderIds == null || senderIds.isEmpty()) {
            return;
        }

        StatusBulkUpdateEvent event = new StatusBulkUpdateEvent("delivery_bulk", chatId, status, actorUserId);
        userDeviceRepository.findByUserIdInAndActiveTrue(senderIds).forEach(device ->
                messagingTemplate.convertAndSend(
                        "/topic/devices/" + device.getDeviceId() + "/status",
                        event
                )
        );
    }

    private void saveMessageEvent(Message message, Long actorUserId, String eventType, Map<String, Object> payload) {
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

    private DeviceMessageEventResponse toDeviceEvent(String type, Message message, MessageEnvelope envelope, Long viewerUserId) {
        return toDeviceEvent(
                type,
                message,
                envelope,
                reactionSummary(message.getId()),
                myReactions(message.getId(), viewerUserId)
        );
    }

    private DeviceMessageEventResponse toDeviceEvent(
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
                myReactions
        );
    }

    private MessageTimelineItemResponse toTimelineItem(Message message, MessageEnvelope envelope, Long viewerUserId) {
        return toTimelineItem(message, envelope, reactionSummary(message.getId()), myReactions(message.getId(), viewerUserId));
    }

    private MessageTimelineItemResponse toTimelineItem(
            Message message,
            MessageEnvelope envelope,
            Map<String, Long> reactions,
            Set<String> myReactions
    ) {
        return new MessageTimelineItemResponse(
                message.getId(),
                message.getChatId(),
                message.getSenderId(),
                message.getSenderDeviceId(),
                message.getClientMessageId(),
                message.getVersion(),
                message.getDeletedAt() != null,
                message.getCreatedAt(),
                message.getEditedAt(),
                message.getStatus().name(),
                envelope == null ? null : toEnvelopeDto(envelope),
                reactions,
                myReactions
        );
    }

    private TimelineEnvelopeDto toEnvelopeDto(MessageEnvelope envelope) {
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

    private Map<Long, Map<String, Long>> reactionSummaries(Collection<Long> messageIds) {
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

    private Map<Long, Set<String>> myReactionsByMessage(Collection<Long> messageIds, Long userId) {
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

    private Set<String> myReactions(Long messageId, Long userId) {
        if (userId == null) return Set.of();

        return messageReactionRepository.findByMessageId(messageId)
                .stream()
                .filter(r -> Objects.equals(r.getUserId(), userId))
                .map(MessageReaction::getEmoji)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String normalizeEmoji(String emoji) {
        String value = String.valueOf(emoji == null ? "" : emoji).trim();
        Set<String> allowed = Set.of("👍", "❤️", "😂", "😮", "😢", "🔥");

        if (!allowed.contains(value)) {
            throw new IllegalArgumentException("Unsupported reaction emoji");
        }

        return value;
    }

    private UserDevice currentDeviceOrNull() {
        return currentDeviceService.requireCurrentDevice();
    }

    private String deviceIdOrFallback(UserDevice currentDevice) {
        return currentDevice == null ? "unknown-device" : currentDevice.getDeviceId();
    }

    private User requireUser(String username) {
        return userIdentityService.require(username);
    }

    private void requireParticipant(Long chatId, Long userId) {
        if (!participantRepository.existsByChatIdAndUserId(chatId, userId)) {
            throw new ChatException("You are not a participant of this chat");
        }
    }

    private List<Long> participantIds(Long chatId) {
        return participantRepository.findUserIdsByChatId(chatId)
                .stream()
                .distinct()
                .toList();
    }

    private void incrementUnreadForOthers(Long chatId, Long senderId) {
        participantRepository.findUserIdsByChatId(chatId).forEach(userId -> {
            if (!Objects.equals(userId, senderId)) {
                unreadService.increment(userId, chatId);
            }
        });
    }

    private void notifyChatListUpdated(Long chatId, String reason) {
        ChatListUpdateEvent payload = ChatListUpdateEvent.forChat(chatId, reason);

        participantRepository.findDistinctUsernamesByChatId(chatId).forEach(username ->
                messagingTemplate.convertAndSend(
                        "/topic/users/" + username + "/chats",
                        payload
                )
        );
    }

    private record StatusBulkUpdateEvent(String type, Long chatId, String status, Long actorUserId) {}

    private record StatusUpdateEvent(Long messageId, String status) {}

    private void incrementCounter(String name) {
        try { meterRegistry.counter(name).increment(); } catch (Exception ignored) {}
    }

    private void incrementCounter(String name, double amount) {
        try { meterRegistry.counter(name).increment(amount); } catch (Exception ignored) {}
    }
}
