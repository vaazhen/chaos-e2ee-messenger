package ru.messenger.chaosmessenger.message.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.crypto.device.UserDevice;
import ru.messenger.chaosmessenger.message.access.MessageAccessService;
import ru.messenger.chaosmessenger.message.domain.MessageEnvelope;
import ru.messenger.chaosmessenger.message.dto.MessageTimelineItemResponse;
import ru.messenger.chaosmessenger.message.repository.MessageEnvelopeRepository;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;
import ru.messenger.chaosmessenger.user.domain.User;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageTimelineService {

    private final MessageRepository messageRepository;
    private final MessageEnvelopeRepository messageEnvelopeRepository;
    private final MessageAccessService messageAccessService;
    private final MessageReactionService messageReactionService;
    private final MessageFanoutService messageFanoutService;

    @Transactional(readOnly = true)
    public List<MessageTimelineItemResponse> getChatTimeline(String username, Long chatId, Long beforeMessageId, int limit) {
        User user = messageAccessService.requireUser(username);
        var currentDevice = messageAccessService.requireCurrentDevice();
        messageAccessService.requireParticipant(chatId, user.getId());

        PageRequest pageable = PageRequest.of(0, Math.max(1, Math.min(limit, 200)));
        List<Message> messages = messageRepository.findByChatIdBefore(chatId, beforeMessageId, pageable);
        Collections.reverse(messages);

        List<Long> messageIds = messages.stream().map(Message::getId).toList();

        List<MessageEnvelope> envelopes = messageIds.isEmpty()
                ? List.of()
                : messageEnvelopeRepository.findByMessageIdInAndTargetDeviceId(messageIds, currentDevice.getDeviceId());

        Map<Long, MessageEnvelope> envelopeByMessageId = envelopes.stream()
                .collect(Collectors.toMap(MessageEnvelope::getMessageId, Function.identity()));

        Map<Long, Map<String, Long>> reactionSummaryByMessageId = messageReactionService.reactionSummaries(messageIds);
        Map<Long, Set<String>> myReactionsByMessageId = messageReactionService.myReactionsByMessage(messageIds, user.getId());

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
                envelope == null ? null : messageFanoutService.toEnvelopeDto(envelope),
                reactions,
                myReactions,
                message.getExpiresAt()
        );
    }
}
