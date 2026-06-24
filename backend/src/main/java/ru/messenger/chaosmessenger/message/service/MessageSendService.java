package ru.messenger.chaosmessenger.message.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.access.ChatAccessService;
import ru.messenger.chaosmessenger.chat.domain.Chat;
import ru.messenger.chaosmessenger.chat.domain.GroupPolicy;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.chat.repository.ChatRepository;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.common.exception.ChatException;
import ru.messenger.chaosmessenger.common.exception.MessageException;
import ru.messenger.chaosmessenger.crypto.device.CurrentDeviceService;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedMessageEnvelopeInput;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedSendMessageRequestV2;
import ru.messenger.chaosmessenger.message.access.MessageAccessService;
import ru.messenger.chaosmessenger.message.domain.MessageEnvelope;
import ru.messenger.chaosmessenger.message.dto.DeviceMessageEventResponse;
import ru.messenger.chaosmessenger.message.repository.MessageEnvelopeRepository;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;
import ru.messenger.chaosmessenger.user.domain.User;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageSendService {

    private final MessageRepository messageRepository;
    private final MessageEnvelopeRepository messageEnvelopeRepository;
    private final ChatRepository chatRepository;
    private final ChatParticipantRepository participantRepository;
    private final UserDeviceRepository userDeviceRepository;
    private final MessageAccessService messageAccessService;
    private final MessageFanoutService messageFanoutService;
    private final ChatAccessService chatAccessService;

    @Transactional
    public DeviceMessageEventResponse sendEncryptedMessageV2(String username, EncryptedSendMessageRequestV2 request) {
        User sender = messageAccessService.requireUser(username);
        UserDevice currentDevice = messageAccessService.requireCurrentDevice();
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
        if (request.selfDestructSeconds() != null && request.selfDestructSeconds() > 0) {
            message.setExpiresAt(LocalDateTime.now().plusSeconds(request.selfDestructSeconds()));
        }
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

        messageFanoutService.incrementCounter("messages_sent_total");

        Map<String, MessageEnvelope> byDevice = persistEnvelopes(message, sender, request.envelopes(), targetDevices);

        final Message msgFinal = message;
        final Map<String, MessageEnvelope> byDeviceFinal = byDevice;
        final Chat chat = chatRepository.findById(request.chatId()).orElse(null);
        TransactionUtils.afterCommit(() -> {
            try {
                messageFanoutService.incrementUnreadForOthers(msgFinal.getChatId(), sender.getId());
                messageFanoutService.fanoutCreatedEvent(msgFinal, byDeviceFinal);
                messageFanoutService.notifyChatListUpdated(msgFinal.getChatId(), "message_created");
                if (chat != null
                        && "DIRECT".equals(chat.getType())
                        && "PENDING".equalsIgnoreCase(chat.getDirectStatus())) {
                    participantRepository.findDistinctUsernamesByChatId(msgFinal.getChatId()).forEach(participantUsername -> {
                        if (!Objects.equals(participantUsername, sender.getUsername())) {
                            chatAccessService.notifyRequestsUpdated(participantUsername, msgFinal.getChatId(), "request_message");
                        }
                    });
                }
                messageFanoutService.notifyOfflineUsersViaPush(msgFinal, sender);
            } catch (Exception e) {
                log.error("afterCommit fanout failed for message {} in chat {}", msgFinal.getId(), msgFinal.getChatId(), e);
            }
        });

        return messageFanoutService.toDeviceEvent("MESSAGE_CREATED", message, byDevice.get(currentDevice.getDeviceId()), sender.getId());
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

        messageAccessService.requireParticipant(request.chatId(), sender.getId());

        Chat chat = chatRepository.findById(request.chatId()).orElse(null);
        if (chat != null && "DIRECT".equals(chat.getType())) {
            String st = chat.getDirectStatus();
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

    public Map<String, UserDevice> validateEnvelopeTargets(
            Long chatId,
            List<EncryptedMessageEnvelopeInput> envelopes,
            UserDevice currentDevice
    ) {
        if (envelopes == null || envelopes.isEmpty()) {
            throw new IllegalArgumentException("envelopes are required");
        }

        Set<String> targetIds = new HashSet<>();
        Set<Long> participantUserIds = messageAccessService.participantIds(chatId).stream().collect(Collectors.toSet());
        Map<String, EncryptedMessageEnvelopeInput> envelopesByTarget = new HashMap<>();

        for (EncryptedMessageEnvelopeInput envelope : envelopes) {
            if (envelope.targetDeviceId() == null || envelope.targetDeviceId().isBlank()) {
                throw new IllegalArgumentException("targetDeviceId is required");
            }
            String targetKey = messageFanoutService.deviceKey(envelope.targetUserId(), envelope.targetDeviceId());
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
                        device -> messageFanoutService.deviceKey(device.getUser().getId(), device.getDeviceId()),
                        Function.identity(),
                        (left, right) -> left
                ));

        if (!activeDevicesByTarget.keySet().equals(envelopesByTarget.keySet())) {
            throw new IllegalArgumentException("Envelope target set does not match active chat devices");
        }

        return activeDevicesByTarget;
    }

    public Map<String, MessageEnvelope> persistEnvelopes(
            Message message,
            User sender,
            List<EncryptedMessageEnvelopeInput> inputs,
            Map<String, UserDevice> activeDevicesByTarget
    ) {
        List<MessageEnvelope> entities = new ArrayList<>();

        for (EncryptedMessageEnvelopeInput input : inputs) {
            UserDevice targetDevice = activeDevicesByTarget.get(
                    messageFanoutService.deviceKey(input.targetUserId(), input.targetDeviceId()));
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

            entities.add(entity);
        }

        List<MessageEnvelope> saved = messageEnvelopeRepository.saveAll(entities);
        messageFanoutService.incrementCounter("message_envelopes_persisted_total", saved.size());

        Map<String, MessageEnvelope> byDevice = new HashMap<>();
        for (MessageEnvelope env : saved) {
            byDevice.put(env.getTargetDeviceId(), env);
        }
        return byDevice;
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
        return messageFanoutService.toDeviceEvent("MESSAGE_CREATED", existingMessage, currentEnvelope, senderUserId);
    }
}
