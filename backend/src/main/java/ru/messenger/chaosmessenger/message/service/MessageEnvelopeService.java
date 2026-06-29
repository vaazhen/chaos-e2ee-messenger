package ru.messenger.chaosmessenger.message.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.crypto.device.UserDeviceRepository;
import ru.messenger.chaosmessenger.crypto.dto.EncryptedMessageEnvelopeInput;
import ru.messenger.chaosmessenger.message.access.MessageAccessService;
import ru.messenger.chaosmessenger.message.domain.MessageEnvelope;
import ru.messenger.chaosmessenger.message.repository.MessageEnvelopeRepository;
import ru.messenger.chaosmessenger.user.domain.User;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageEnvelopeService {

    private final MessageEnvelopeRepository messageEnvelopeRepository;
    private final UserDeviceRepository userDeviceRepository;
    private final MessageAccessService messageAccessService;
    private final MessageFanoutService messageFanoutService;

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
            entity.setCreatedAt(java.time.LocalDateTime.now());

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
}
