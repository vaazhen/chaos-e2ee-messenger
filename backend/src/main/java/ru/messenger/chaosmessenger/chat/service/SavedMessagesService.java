package ru.messenger.chaosmessenger.chat.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.access.ChatAccessService;
import ru.messenger.chaosmessenger.chat.domain.Chat;
import ru.messenger.chaosmessenger.chat.domain.ChatParticipant;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.chat.repository.ChatRepository;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.common.exception.ChatException;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SavedMessagesService {

    private final ChatRepository chatRepository;
    private final ChatParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final ChatAccessService chatAccessService;
    private final ChatOutboxService chatOutboxService;

    @Transactional
    public Long createOrGetSavedMessagesChat(String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ChatException("Current user not found"));

        Optional<Long> existing = participantRepository.findSavedChatId(user.getId());
        if (existing.isPresent()) {
            Long chatId = existing.get();
            String username = user.getUsername();
            chatOutboxService.chatListUpdated(chatId, "saved_chat_exists");
            TransactionUtils.afterCommit(() -> chatAccessService.notifyChatListUpdated(username, chatId, "saved_chat_exists"));
            return chatId;
        }

        Chat chat = new Chat();
        chat.setType("SAVED");
        chat.setName("SAVED");
        chat.setCreatedAt(LocalDateTime.now());
        chat = chatRepository.save(chat);

        participantRepository.save(new ChatParticipant(chat.getId(), user.getId()));

        Long chatId = chat.getId();
        String username = user.getUsername();
        chatOutboxService.chatListUpdated(chatId, "saved_chat_created");
        TransactionUtils.afterCommit(() -> chatAccessService.notifyChatListUpdated(username, chatId, "saved_chat_created"));

        return chatId;
    }
}
