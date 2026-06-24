package ru.messenger.chaosmessenger.chat.access;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.domain.Chat;
import ru.messenger.chaosmessenger.chat.domain.ChatParticipant;
import ru.messenger.chaosmessenger.chat.domain.GroupRole;
import ru.messenger.chaosmessenger.chat.dto.ChatResponse;
import ru.messenger.chaosmessenger.chat.dto.GroupParticipantInfo;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.chat.repository.ChatRepository;
import ru.messenger.chaosmessenger.common.exception.ChatException;
import ru.messenger.chaosmessenger.infra.presence.OnlineService;
import ru.messenger.chaosmessenger.infra.presence.UnreadService;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatQueryService {

    private final ChatRepository chatRepository;
    private final ChatParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final UnreadService unreadService;
    private final OnlineService onlineService;
    private final ChatAccessService chatAccessService;

    @Transactional(readOnly = true)
    public List<ChatResponse> getMyChats(String username) {
        return getMyChats(username, 0, 100);
    }

    @Transactional(readOnly = true)
    public List<ChatResponse> getMyChats(String username, int offset, int limit) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ChatException("User not found"));

        int safeOffset = Math.max(0, offset);
        int safeLimit = Math.max(1, Math.min(limit, 100));

        List<Long> chatIds = chatRepository.findChatIdsByUserIdOrderByActivity(
                currentUser.getId(),
                safeLimit,
                safeOffset
        );
        if (chatIds.isEmpty()) {
            return List.of();
        }

        List<Chat> chats = chatRepository.findByIdIn(chatIds);
        List<Long> visibleChatIds = chats.stream()
                .filter(c -> {
                    if (c.getDeletedAt() != null) {
                        return false;
                    }
                    if (!"DIRECT".equals(c.getType())) {
                        return true;
                    }
                    String st = c.getDirectStatus();
                    if ("DECLINED".equalsIgnoreCase(st)) {
                        return false;
                    }
                    if ("PENDING".equalsIgnoreCase(st)) {
                        return Objects.equals(c.getDirectRequestedBy(), currentUser.getId());
                    }
                    return true;
                })
                .map(Chat::getId)
                .toList();
        if (visibleChatIds.isEmpty()) {
            return List.of();
        }

        List<Long> orderedVisibleIds = chatIds.stream()
                .filter(visibleChatIds::contains)
                .toList();
        chats = chats.stream()
                .filter(c -> visibleChatIds.contains(c.getId()))
                .toList();

        List<ChatParticipant> allParticipants = participantRepository.findByChatIdIn(chatIds);
        Map<Long, List<ChatParticipant>> byChat = allParticipants.stream()
                .collect(Collectors.groupingBy(ChatParticipant::getChatId));

        Set<Long> otherUserIds = allParticipants.stream()
                .map(ChatParticipant::getUserId)
                .filter(id -> !id.equals(currentUser.getId()))
                .collect(Collectors.toSet());

        Map<Long, User> usersById = userRepository.findAllById(otherUserIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        Map<Long, Message> lastMessagesByChatId = messageRepository.findLatestByChatIds(orderedVisibleIds).stream()
                .collect(Collectors.toMap(Message::getChatId, m -> m,
                        (left, right) -> left.getCreatedAt().isAfter(right.getCreatedAt()) ? left : right));

        final String savedName = chatAccessService.savedChatName();

        Map<Long, Long> unreadByChatIdResult = unreadService.getMany(currentUser.getId(), orderedVisibleIds);
        final Map<Long, Long> unreadByChatId = unreadByChatIdResult == null ? Map.of() : unreadByChatIdResult;

        Set<String> usernames = usersById.values().stream()
                .map(User::getUsername)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, Boolean> onlineByUsernameResult = onlineService.isOnlineMany(usernames);
        final Map<String, Boolean> onlineByUsername = onlineByUsernameResult == null
                ? Map.of()
                : onlineByUsernameResult;
        Map<String, LocalDateTime> lastSeenByUsernameResult = onlineService.getLastSeenMany(usernames);
        final Map<String, LocalDateTime> lastSeenByUsername = lastSeenByUsernameResult == null
                ? Map.of()
                : lastSeenByUsernameResult;

        Map<Long, ChatResponse> responsesByChatId = chats.stream().map(chat -> {
                    List<ChatParticipant> participants = byChat.getOrDefault(chat.getId(), List.of());
                    Optional<Message> lastMsg = Optional.ofNullable(lastMessagesByChatId.get(chat.getId()));

                    String lastContent = lastMsg.map(Message::getContent).orElse(null);
                    Long lastMessageId = lastMsg.map(Message::getId).orElse(null);
                    LocalDateTime lastAt = lastMsg.map(Message::getCreatedAt).orElse(null);
                    Long lastSenderId = lastMsg.map(Message::getSenderId).orElse(null);
                    long unread = unreadByChatId.getOrDefault(chat.getId(), 0L);
                    boolean isSaved = "SAVED".equals(chat.getType());
                    boolean isGroup = "GROUP".equals(chat.getType());

                    if (isSaved) {
                        return ChatResponse.forSaved(new ChatResponse.SavedParams(
                                chat.getId(),
                                chat.getType(),
                                savedName,
                                lastContent,
                                lastMessageId,
                                lastAt,
                                lastSenderId,
                                participants.stream().map(ChatParticipant::getUserId).toList(),
                                unread
                        ));
                    }

                    if (isGroup) {
                        ChatParticipant me = participants.stream()
                                .filter(p -> p.getUserId().equals(currentUser.getId()))
                                .findFirst().orElse(null);
                        List<GroupParticipantInfo> groupInfos = participants.stream()
                                .map(p -> {
                                    User u = usersById.get(p.getUserId());
                                    if (u == null && p.getUserId().equals(currentUser.getId())) {
                                        u = currentUser;
                                    }
                                    return new GroupParticipantInfo(
                                            p.getUserId(),
                                            u != null ? u.getUsername() : null,
                                            u != null ? u.getFirstName() : null,
                                            u != null ? u.getLastName() : null,
                                            u != null ? u.getAvatarUrl() : null,
                                            p.groupRole().name(),
                                            p.getMutedUntil(),
                                            p.isBanned()
                                    );
                                })
                                .toList();
                        return ChatResponse.forGroup(new ChatResponse.GroupParams(
                                chat.getId(),
                                chat.getType(),
                                chat.getName(),
                                lastContent,
                                lastMessageId,
                                lastAt,
                                lastSenderId,
                                participants.stream().map(ChatParticipant::getUserId).toList(),
                                unread,
                                chat.getAvatarUrl(),
                                chat.getBio(),
                                chat.getWhoCanWrite(),
                                chat.getWhoCanEditInfo(),
                                chat.getWhoCanInvite(),
                                me != null ? me.groupRole().name() : GroupRole.MEMBER.name(),
                                groupInfos
                        ));
                    }

                    ChatParticipant otherP = participants.stream()
                            .filter(p -> !p.getUserId().equals(currentUser.getId()))
                            .findFirst().orElse(null);
                    User otherUser = otherP != null ? usersById.get(otherP.getUserId()) : null;
                    boolean online = otherUser != null && Boolean.TRUE.equals(onlineByUsername.get(otherUser.getUsername()));
                    LocalDateTime lastSeen = otherUser != null ? lastSeenByUsername.get(otherUser.getUsername()) : null;

                    return ChatResponse.forDirect(new ChatResponse.DirectParams(
                            chat.getId(),
                            chat.getType(),
                            lastContent,
                            lastMessageId,
                            lastAt,
                            lastSenderId,
                            participants.stream().map(ChatParticipant::getUserId).toList(),
                            otherUser != null ? otherUser.getId() : null,
                            otherUser != null ? otherUser.getUsername() : null,
                            otherUser != null ? otherUser.getFirstName() : null,
                            otherUser != null ? otherUser.getLastName() : null,
                            otherUser != null ? otherUser.getBio() : null,
                            otherUser != null ? otherUser.getAvatarUrl() : null,
                            unread,
                            online,
                            lastSeen,
                            chat.getDirectStatus(),
                            chat.getDirectRequestedBy()
                    ));
                })
                .collect(Collectors.toMap(ChatResponse::chatId, response -> response));

        return orderedVisibleIds.stream()
                .map(responsesByChatId::get)
                .filter(Objects::nonNull)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatResponse> getMyDirectRequests(String username, int offset, int limit) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ChatException("User not found"));

        int safeOffset = Math.max(0, offset);
        int safeLimit = Math.max(1, Math.min(limit, 100));

        List<Long> chatIds = chatRepository.findPendingDirectRequestChatIdsForUser(
                currentUser.getId(),
                safeLimit,
                safeOffset
        );
        if (chatIds.isEmpty()) {
            return List.of();
        }

        List<Chat> chats = chatRepository.findByIdIn(chatIds);
        if (chats.isEmpty()) {
            return List.of();
        }

        List<ChatParticipant> allParticipants = participantRepository.findByChatIdIn(chatIds);
        Map<Long, List<ChatParticipant>> byChat = allParticipants.stream()
                .collect(Collectors.groupingBy(ChatParticipant::getChatId));

        Set<Long> otherUserIds = allParticipants.stream()
                .map(ChatParticipant::getUserId)
                .filter(id -> !id.equals(currentUser.getId()))
                .collect(Collectors.toSet());

        Map<Long, User> usersById = userRepository.findAllById(otherUserIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        Map<Long, Message> lastMessagesByChatId = messageRepository.findLatestByChatIds(chatIds).stream()
                .collect(Collectors.toMap(Message::getChatId, m -> m,
                        (left, right) -> left.getCreatedAt().isAfter(right.getCreatedAt()) ? left : right));

        Map<Long, Long> unreadByChatIdResult = unreadService.getMany(currentUser.getId(), chatIds);
        final Map<Long, Long> unreadByChatId = unreadByChatIdResult == null ? Map.of() : unreadByChatIdResult;

        Set<String> usernames = usersById.values().stream()
                .map(User::getUsername)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, Boolean> onlineByUsernameResult = onlineService.isOnlineMany(usernames);
        final Map<String, Boolean> onlineByUsername = onlineByUsernameResult == null
                ? Map.of()
                : onlineByUsernameResult;
        Map<String, LocalDateTime> lastSeenByUsernameResult = onlineService.getLastSeenMany(usernames);
        final Map<String, LocalDateTime> lastSeenByUsername = lastSeenByUsernameResult == null
                ? Map.of()
                : lastSeenByUsernameResult;

        Map<Long, ChatResponse> responsesByChatId = chats.stream().map(chat -> {
            List<ChatParticipant> participants = byChat.getOrDefault(chat.getId(), List.of());
            Optional<Message> lastMsg = Optional.ofNullable(lastMessagesByChatId.get(chat.getId()));

            String lastContent = lastMsg.map(Message::getContent).orElse(null);
            Long lastMessageId = lastMsg.map(Message::getId).orElse(null);
            LocalDateTime lastAt = lastMsg.map(Message::getCreatedAt).orElse(null);
            Long lastSenderId = lastMsg.map(Message::getSenderId).orElse(null);
            long unread = unreadByChatId.getOrDefault(chat.getId(), 0L);

            ChatParticipant otherP = participants.stream()
                    .filter(p -> !p.getUserId().equals(currentUser.getId()))
                    .findFirst().orElse(null);
            User otherUser = otherP != null ? usersById.get(otherP.getUserId()) : null;
            boolean online = otherUser != null && Boolean.TRUE.equals(onlineByUsername.get(otherUser.getUsername()));
            LocalDateTime lastSeen = otherUser != null ? lastSeenByUsername.get(otherUser.getUsername()) : null;

            return ChatResponse.forDirect(new ChatResponse.DirectParams(
                    chat.getId(),
                    chat.getType(),
                    lastContent,
                    lastMessageId,
                    lastAt,
                    lastSenderId,
                    participants.stream().map(ChatParticipant::getUserId).toList(),
                    otherUser != null ? otherUser.getId() : null,
                    otherUser != null ? otherUser.getUsername() : null,
                    otherUser != null ? otherUser.getFirstName() : null,
                    otherUser != null ? otherUser.getLastName() : null,
                    otherUser != null ? otherUser.getBio() : null,
                    otherUser != null ? otherUser.getAvatarUrl() : null,
                    unread,
                    online,
                    lastSeen,
                    chat.getDirectStatus(),
                    chat.getDirectRequestedBy()
            ));
        }).collect(Collectors.toMap(ChatResponse::chatId, response -> response));

        return chatIds.stream()
                .map(responsesByChatId::get)
                .filter(Objects::nonNull)
                .toList();
    }

    @Transactional(readOnly = true)
    public ChatResponse getChatForUser(String username, Long chatId) {
        try {
            return getChatForUserById(username, chatId);
        } catch (ChatException ex) {
            return getMyChats(username, 0, 1000).stream()
                    .filter(c -> Objects.equals(c.chatId(), chatId))
                    .findFirst()
                    .orElseThrow(() -> ex);
        }
    }

    @Transactional(readOnly = true)
    public ChatResponse getChatForUserById(String username, Long chatId) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ChatException("User not found"));

        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ChatException("Chat not found"));

        if (chat.getDeletedAt() != null) {
            throw new ChatException("Chat not found");
        }

        if (!participantRepository.existsByChatIdAndUserId(chatId, currentUser.getId())) {
            throw new ChatException("Chat not found");
        }

        if ("DIRECT".equals(chat.getType())) {
            String st = chat.getDirectStatus();
            if ("DECLINED".equalsIgnoreCase(st)) {
                throw new ChatException("Chat not found");
            }
            if ("PENDING".equalsIgnoreCase(st) && !Objects.equals(chat.getDirectRequestedBy(), currentUser.getId())) {
                throw new ChatException("Chat not found");
            }
        }

        List<ChatParticipant> participants = participantRepository.findByChatId(chatId);
        List<Long> participantIds = participants.stream().map(ChatParticipant::getUserId).distinct().toList();
        Map<Long, User> usersById = userRepository.findAllById(participantIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        Message lastMsg = messageRepository.findLatestByChatIds(List.of(chatId)).stream().findFirst().orElse(null);
        String lastContent = lastMsg != null ? lastMsg.getContent() : null;
        Long lastMessageId = lastMsg != null ? lastMsg.getId() : null;
        LocalDateTime lastAt = lastMsg != null ? lastMsg.getCreatedAt() : null;
        Long lastSenderId = lastMsg != null ? lastMsg.getSenderId() : null;

        long unread = unreadService.get(currentUser.getId(), chatId);

        if ("SAVED".equals(chat.getType())) {
            return ChatResponse.forSaved(new ChatResponse.SavedParams(
                    chat.getId(),
                    chat.getType(),
                    chatAccessService.savedChatName(),
                    lastContent,
                    lastMessageId,
                    lastAt,
                    lastSenderId,
                    participantIds,
                    unread
            ));
        }

        if ("GROUP".equals(chat.getType())) {
            ChatParticipant me = participants.stream()
                    .filter(p -> p.getUserId().equals(currentUser.getId()))
                    .findFirst().orElse(null);
            List<GroupParticipantInfo> groupInfos = participants.stream()
                    .map(p -> {
                        User u = usersById.get(p.getUserId());
                        if (u == null && p.getUserId().equals(currentUser.getId())) {
                            u = currentUser;
                        }
                        return new GroupParticipantInfo(
                                p.getUserId(),
                                u != null ? u.getUsername() : null,
                                u != null ? u.getFirstName() : null,
                                u != null ? u.getLastName() : null,
                                u != null ? u.getAvatarUrl() : null,
                                p.groupRole().name(),
                                p.getMutedUntil(),
                                p.isBanned()
                        );
                    })
                    .toList();
            return ChatResponse.forGroup(new ChatResponse.GroupParams(
                    chat.getId(),
                    chat.getType(),
                    chat.getName(),
                    lastContent,
                    lastMessageId,
                    lastAt,
                    lastSenderId,
                    participantIds,
                    unread,
                    chat.getAvatarUrl(),
                    chat.getBio(),
                    chat.getWhoCanWrite(),
                    chat.getWhoCanEditInfo(),
                    chat.getWhoCanInvite(),
                    me != null ? me.groupRole().name() : GroupRole.MEMBER.name(),
                    groupInfos
            ));
        }

        ChatParticipant otherP = participants.stream()
                .filter(p -> !p.getUserId().equals(currentUser.getId()))
                .findFirst().orElse(null);
        User otherUser = otherP != null ? usersById.get(otherP.getUserId()) : null;
        boolean online = otherUser != null && onlineService.isOnline(otherUser.getUsername());
        LocalDateTime lastSeen = otherUser != null ? onlineService.getLastSeen(otherUser.getUsername()) : null;

        return ChatResponse.forDirect(new ChatResponse.DirectParams(
                chat.getId(),
                chat.getType(),
                lastContent,
                lastMessageId,
                lastAt,
                lastSenderId,
                participantIds,
                otherUser != null ? otherUser.getId() : null,
                otherUser != null ? otherUser.getUsername() : null,
                otherUser != null ? otherUser.getFirstName() : null,
                otherUser != null ? otherUser.getLastName() : null,
                otherUser != null ? otherUser.getBio() : null,
                otherUser != null ? otherUser.getAvatarUrl() : null,
                unread,
                online,
                lastSeen,
                chat.getDirectStatus(),
                chat.getDirectRequestedBy()
        ));
    }
}
