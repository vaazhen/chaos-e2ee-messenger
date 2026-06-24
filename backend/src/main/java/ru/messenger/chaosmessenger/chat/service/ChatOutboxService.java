package ru.messenger.chaosmessenger.chat.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.outbox.OutboxService;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ChatOutboxService {

    private final ChatParticipantRepository participantRepository;
    private final OutboxService outboxService;

    public void chatListUpdated(Long chatId, String reason) {
        write(chatId, reason, false);
    }

    public void requestUpdated(Long chatId, String reason) {
        write(chatId, reason, true);
    }

    private void write(Long chatId, String reason, boolean request) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("chatId", chatId);
        payload.put("eventType", reason.toUpperCase());
        payload.put("reason", reason);
        payload.put("participantUsernames", participantRepository.findDistinctUsernamesByChatId(chatId));
        outboxService.write(request ? "request" : "chat", String.valueOf(chatId), reason.toUpperCase(), payload);
    }
}
