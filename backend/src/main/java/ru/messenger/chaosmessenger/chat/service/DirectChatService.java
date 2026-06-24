package ru.messenger.chaosmessenger.chat.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
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
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DirectChatService {

    private final ChatRepository chatRepository;
    private final ChatParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final ChatAccessService chatAccessService;

    @Transactional
    public Long createDirectChat(String currentUsername, Long targetUserId) {
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ChatException("Current user not found"));
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ChatException("Target user not found"));

        if (currentUser.getId().equals(targetUser.getId())) {
            throw new ChatException("You cannot create a chat with yourself");
        }

        long lowUserId = Math.min(currentUser.getId(), targetUser.getId());
        long highUserId = Math.max(currentUser.getId(), targetUser.getId());
        Optional<Chat> existing = chatRepository.findActiveDirectByNormalizedPair(lowUserId, highUserId);
        Long existingChatId = existing.map(Chat::getId).orElseGet(() ->
                participantRepository.findDirectChatId(currentUser.getId(), targetUser.getId()).orElse(null)
        );
        if (existingChatId != null) {
            Long chatId = existingChatId;
            Chat existingChat = chatRepository.findById(chatId).orElse(null);
            if (existingChat != null) {
                String status = existingChat.getDirectStatus();
                if ("PENDING".equalsIgnoreCase(status)
                        && !Objects.equals(existingChat.getDirectRequestedBy(), currentUser.getId())) {
                    existingChat.setDirectStatus("ACCEPTED");
                    chatRepository.save(existingChat);
                } else if ("DECLINED".equalsIgnoreCase(status)) {
                    existingChat.setDirectStatus("PENDING");
                    existingChat.setDirectRequestedBy(currentUser.getId());
                    chatRepository.save(existingChat);
                } else if (existingChat.getDirectStatus() == null) {
                    existingChat.setDirectStatus("ACCEPTED");
                    chatRepository.save(existingChat);
                }
            }
            String currentUsr = currentUser.getUsername();
            String targetUsr = targetUser.getUsername();
            Chat updated = chatRepository.findById(chatId).orElse(null);
            boolean targetOnlyRequest =
                    updated != null
                            && "DIRECT".equals(updated.getType())
                            && "PENDING".equalsIgnoreCase(updated.getDirectStatus())
                            && Objects.equals(updated.getDirectRequestedBy(), currentUser.getId());

            TransactionUtils.afterCommit(() -> {
                chatAccessService.notifyChatListUpdated(currentUsr, chatId, "chat_exists");
                if (targetOnlyRequest) {
                    chatAccessService.notifyRequestsUpdated(targetUsr, chatId, "request_exists");
                } else {
                    chatAccessService.notifyChatListUpdated(targetUsr, chatId, "chat_exists");
                }
            });
            return chatId;
        }

        Chat chat = new Chat();
        chat.setType("DIRECT");
        chat.setCreatedAt(LocalDateTime.now());
        chat.setDirectStatus("PENDING");
        chat.setDirectRequestedBy(currentUser.getId());
        chat.setDirectUserLowId(lowUserId);
        chat.setDirectUserHighId(highUserId);
        try {
            chat = chatRepository.save(chat);
            chatRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            Chat existingChat = chatRepository.findActiveDirectByNormalizedPair(lowUserId, highUserId).orElseThrow(() -> ex);
            return existingChat.getId();
        }

        participantRepository.save(new ChatParticipant(chat.getId(), currentUser.getId()));
        participantRepository.save(new ChatParticipant(chat.getId(), targetUser.getId()));

        final Long chatId = chat.getId();
        final String currentUsr = currentUser.getUsername();
        final String targetUsr = targetUser.getUsername();
        TransactionUtils.afterCommit(() -> {
            chatAccessService.notifyChatListUpdated(currentUsr, chatId, "chat_created");
            chatAccessService.notifyRequestsUpdated(targetUsr, chatId, "request_created");
        });

        return chatId;
    }

    @Transactional
    public Long createOrGetDirectChatByUsername(String currentUsername, String targetUsername) {
        User targetUser = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new RuntimeException("Target user not found"));
        return createDirectChat(currentUsername, targetUser.getId());
    }

    @Transactional
    public void acceptDirectRequest(String username, Long chatId) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ChatException("User not found"));
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ChatException("Chat not found"));

        if (!"DIRECT".equals(chat.getType())) {
            throw new ChatException("Not a direct chat");
        }
        if (!participantRepository.existsByChatIdAndUserId(chatId, currentUser.getId())) {
            throw new ChatException("Not a chat participant");
        }
        if (!"PENDING".equalsIgnoreCase(chat.getDirectStatus())) {
            return;
        }
        if (Objects.equals(chat.getDirectRequestedBy(), currentUser.getId())) {
            throw new ChatException("Requester cannot accept own request");
        }

        chat.setDirectStatus("ACCEPTED");
        chatRepository.save(chat);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() -> {
            chatAccessService.notifyRequestsUpdated(username, chatId, "request_accepted");
            participantUsernames.forEach(u ->
                    chatAccessService.notifyChatListUpdated(u, chatId, "request_accepted")
            );
        });
    }

    @Transactional
    public void declineDirectRequest(String username, Long chatId) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ChatException("User not found"));
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ChatException("Chat not found"));

        if (!"DIRECT".equals(chat.getType())) {
            throw new ChatException("Not a direct chat");
        }
        if (!participantRepository.existsByChatIdAndUserId(chatId, currentUser.getId())) {
            throw new ChatException("Not a chat participant");
        }
        if (!"PENDING".equalsIgnoreCase(chat.getDirectStatus())) {
            return;
        }
        if (Objects.equals(chat.getDirectRequestedBy(), currentUser.getId())) {
            throw new ChatException("Requester cannot decline own request");
        }

        chat.setDirectStatus("DECLINED");
        chatRepository.save(chat);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() -> {
            chatAccessService.notifyRequestsUpdated(username, chatId, "request_declined");
            participantUsernames.forEach(u ->
                    chatAccessService.notifyChatListUpdated(u, chatId, "request_declined")
            );
        });
    }
}
