package ru.messenger.chaosmessenger.chat.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.domain.*;
import ru.messenger.chaosmessenger.chat.dto.*;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.chat.repository.ChatRepository;
import ru.messenger.chaosmessenger.common.TransactionUtils;
import ru.messenger.chaosmessenger.common.exception.ChatException;
import ru.messenger.chaosmessenger.infra.presence.OnlineService;
import ru.messenger.chaosmessenger.infra.presence.UnreadService;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRepository chatRepository;
    private final ChatParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final UnreadService unreadService;
    private final OnlineService onlineService;
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageSource messageSource;

    /**
     * Resolve the localised name for the Saved Messages chat.
     */
    private String savedChatName() {
        return messageSource.getMessage("chat.saved.name", null, "Saved Messages", LocaleContextHolder.getLocale());
    }

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
                String status = String.valueOf(existingChat.getDirectStatus());
                // If the other side already requested this chat, and current user now initiates too —
                // accept immediately.
                if ("PENDING".equalsIgnoreCase(status)
                        && !Objects.equals(existingChat.getDirectRequestedBy(), currentUser.getId())) {
                    existingChat.setDirectStatus("ACCEPTED");
                    chatRepository.save(existingChat);
                } else if ("DECLINED".equalsIgnoreCase(status)) {
                    // Re-open declined direct as a fresh request from current user.
                    existingChat.setDirectStatus("PENDING");
                    existingChat.setDirectRequestedBy(currentUser.getId());
                    chatRepository.save(existingChat);
                } else if (existingChat.getDirectStatus() == null) {
                    // Legacy direct chats before migration are considered accepted.
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
                            && "PENDING".equalsIgnoreCase(String.valueOf(updated.getDirectStatus()))
                            && Objects.equals(updated.getDirectRequestedBy(), currentUser.getId());

            TransactionUtils.afterCommit(() -> {
                notifyChatListUpdated(currentUsr, chatId, "chat_exists");
                if (targetOnlyRequest) {
                    notifyRequestsUpdated(targetUsr, chatId, "request_exists");
                } else {
                    notifyChatListUpdated(targetUsr, chatId, "chat_exists");
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
            notifyChatListUpdated(currentUsr, chatId, "chat_created");
            notifyRequestsUpdated(targetUsr, chatId, "request_created");
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
    public Long createOrGetSavedMessagesChat(String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ChatException("Current user not found"));

        Optional<Long> existing = participantRepository.findSavedChatId(user.getId());
        if (existing.isPresent()) {
            Long chatId = existing.get();
            String username = user.getUsername();
            TransactionUtils.afterCommit(() -> notifyChatListUpdated(username, chatId, "saved_chat_exists"));
            return chatId;
        }

        Chat chat = new Chat();
        chat.setType("SAVED");
        chat.setName("SAVED");   // internal marker — display name comes from i18n
        chat.setCreatedAt(LocalDateTime.now());
        chat = chatRepository.save(chat);

        participantRepository.save(new ChatParticipant(chat.getId(), user.getId()));

        Long chatId = chat.getId();
        String username = user.getUsername();
        TransactionUtils.afterCommit(() -> notifyChatListUpdated(username, chatId, "saved_chat_created"));

        return chatId;
    }

    @Transactional
    public Long createGroupChat(String currentUsername, String name, List<Long> memberIds) {
        if (name == null || name.isBlank()) throw new ChatException("Group name is required");
        if (memberIds == null || memberIds.isEmpty())
            throw new ChatException("Group must have at least one other member");

        User creator = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ChatException("Current user not found"));

        List<Long> distinctMemberIds = memberIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        List<Long> otherMemberIds = distinctMemberIds.stream()
                .filter(id -> !id.equals(creator.getId()))
                .toList();
        if (otherMemberIds.isEmpty()) {
            throw new ChatException("Group must have at least one other member");
        }

        List<User> members = userRepository.findAllById(otherMemberIds);
        Set<Long> foundMemberIds = members.stream()
                .map(User::getId)
                .collect(Collectors.toSet());
        if (!foundMemberIds.containsAll(otherMemberIds)) {
            throw new ChatException("One or more member users not found");
        }

        Chat chat = new Chat();
        chat.setType("GROUP");
        chat.setName(name.trim());
        chat.setWhoCanWrite("ALL");
        chat.setWhoCanEditInfo("ADMINS");
        chat.setWhoCanInvite("ADMINS");
        chat.setCreatedAt(LocalDateTime.now());
        chat = chatRepository.save(chat);

        List<ChatParticipant> participantsToSave = new ArrayList<>();
        participantsToSave.add(new ChatParticipant(chat.getId(), creator.getId(), GroupRole.OWNER));
        for (User member : members) {
            participantsToSave.add(new ChatParticipant(chat.getId(), member.getId(), GroupRole.MEMBER));
        }
        participantRepository.saveAll(participantsToSave);

        final Long chatId = chat.getId();
        final List<String> notifyUsers = members.stream()
                .map(User::getUsername)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(ArrayList::new));
        notifyUsers.add(creator.getUsername());
        final List<String> distinctNotifyUsers = notifyUsers.stream().distinct().toList();
        TransactionUtils.afterCommit(() ->
                distinctNotifyUsers.forEach(u -> notifyChatListUpdated(u, chatId, "chat_created")));

        return chatId;
    }

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
        if (chatIds.isEmpty()) return List.of();

        List<Chat> chats = chatRepository.findByIdIn(chatIds);
        // Filter message requests from the main list:
        // - PENDING: visible only to the requester
        // - DECLINED: hidden from both
        List<Long> visibleChatIds = chats.stream()
                .filter(c -> {
                    if (c.getDeletedAt() != null) return false;
                    if (!"DIRECT".equals(c.getType())) return true;
                    String st = String.valueOf(c.getDirectStatus());
                    if ("DECLINED".equalsIgnoreCase(st)) return false;
                    if ("PENDING".equalsIgnoreCase(st)) {
                        return Objects.equals(c.getDirectRequestedBy(), currentUser.getId());
                    }
                    return true; // ACCEPTED or null
                })
                .map(Chat::getId)
                .toList();
        if (visibleChatIds.isEmpty()) return List.of();

        // Keep original ordering but drop hidden ones.
        List<Long> orderedVisibleIds = chatIds.stream()
                .filter(id -> visibleChatIds.contains(id))
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

        final String savedName = savedChatName();

        Map<Long, Long> rawUnreadByChatId = unreadService.getMany(currentUser.getId(), orderedVisibleIds);
        final Map<Long, Long> unreadByChatId = (rawUnreadByChatId == null || rawUnreadByChatId.isEmpty())
                ? orderedVisibleIds.stream()
                .collect(Collectors.toMap(
                        Function.identity(),
                        chatId -> unreadService.get(currentUser.getId(), chatId)
                ))
                : rawUnreadByChatId;

        Set<String> usernames = usersById.values().stream()
                .map(User::getUsername)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, Boolean> rawOnlineByUsername = onlineService.isOnlineMany(usernames);
        Map<String, LocalDateTime> rawLastSeenByUsername = onlineService.getLastSeenMany(usernames);
        final Map<String, Boolean> onlineByUsername = (rawOnlineByUsername == null || rawOnlineByUsername.isEmpty())
                ? usernames.stream().collect(Collectors.toMap(Function.identity(), onlineService::isOnline))
                : rawOnlineByUsername;
        final Map<String, LocalDateTime> lastSeenByUsername = (rawLastSeenByUsername == null || rawLastSeenByUsername.isEmpty())
                ? usernames.stream().collect(Collectors.toMap(
                Function.identity(),
                uname -> {
                    LocalDateTime lastSeen = onlineService.getLastSeen(uname);
                    return lastSeen != null ? lastSeen : LocalDateTime.now().minusDays(1);
                }
        ))
                : rawLastSeenByUsername;

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
                                    if (u == null && p.getUserId().equals(currentUser.getId())) u = currentUser;
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
        if (chatIds.isEmpty()) return List.of();

        List<Chat> chats = chatRepository.findByIdIn(chatIds);
        if (chats.isEmpty()) return List.of();

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

        Map<Long, Long> rawUnreadByChatId = unreadService.getMany(currentUser.getId(), chatIds);
        final Map<Long, Long> unreadByChatId = (rawUnreadByChatId == null || rawUnreadByChatId.isEmpty())
                ? chatIds.stream()
                .collect(Collectors.toMap(
                        Function.identity(),
                        chatId -> unreadService.get(currentUser.getId(), chatId)
                ))
                : rawUnreadByChatId;

        Set<String> usernames = usersById.values().stream()
                .map(User::getUsername)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, Boolean> rawOnlineByUsername = onlineService.isOnlineMany(usernames);
        Map<String, LocalDateTime> rawLastSeenByUsername = onlineService.getLastSeenMany(usernames);
        final Map<String, Boolean> onlineByUsername = (rawOnlineByUsername == null || rawOnlineByUsername.isEmpty())
                ? usernames.stream().collect(Collectors.toMap(Function.identity(), onlineService::isOnline))
                : rawOnlineByUsername;
        final Map<String, LocalDateTime> lastSeenByUsername = (rawLastSeenByUsername == null || rawLastSeenByUsername.isEmpty())
                ? usernames.stream().collect(Collectors.toMap(
                Function.identity(),
                uname -> {
                    LocalDateTime lastSeen = onlineService.getLastSeen(uname);
                    return lastSeen != null ? lastSeen : LocalDateTime.now().minusDays(1);
                }
        ))
                : rawLastSeenByUsername;

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

    @Transactional
    public void acceptDirectRequest(String username, Long chatId) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ChatException("User not found"));
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ChatException("Chat not found"));

        if (!"DIRECT".equals(chat.getType())) throw new ChatException("Not a direct chat");
        if (!participantRepository.existsByChatIdAndUserId(chatId, currentUser.getId())) {
            throw new ChatException("Not a chat participant");
        }
        if (!"PENDING".equalsIgnoreCase(String.valueOf(chat.getDirectStatus()))) return;
        if (Objects.equals(chat.getDirectRequestedBy(), currentUser.getId())) {
            throw new ChatException("Requester cannot accept own request");
        }

        chat.setDirectStatus("ACCEPTED");
        chatRepository.save(chat);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() -> {
            // Move from requests -> chats for the recipient, update chats for requester.
            notifyRequestsUpdated(username, chatId, "request_accepted");
            participantUsernames.forEach(u ->
                    notifyChatListUpdated(u, chatId, "request_accepted")
            );
        });
    }

    @Transactional
    public void declineDirectRequest(String username, Long chatId) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ChatException("User not found"));
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ChatException("Chat not found"));

        if (!"DIRECT".equals(chat.getType())) throw new ChatException("Not a direct chat");
        if (!participantRepository.existsByChatIdAndUserId(chatId, currentUser.getId())) {
            throw new ChatException("Not a chat participant");
        }
        if (!"PENDING".equalsIgnoreCase(String.valueOf(chat.getDirectStatus()))) return;
        if (Objects.equals(chat.getDirectRequestedBy(), currentUser.getId())) {
            throw new ChatException("Requester cannot decline own request");
        }

        chat.setDirectStatus("DECLINED");
        chatRepository.save(chat);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() -> {
            notifyRequestsUpdated(username, chatId, "request_declined");
            participantUsernames.forEach(u ->
                    notifyChatListUpdated(u, chatId, "request_declined")
            );
        });
    }

    @Transactional
    public ChatResponse inviteGroupParticipants(String username, Long chatId, UpdateGroupParticipantsRequest request) {
        User actor = userRepository.findByUsername(username)
                .orElseThrow(() -> new ChatException("User not found"));
        Chat chat = requireActiveGroup(chatId);
        ChatParticipant actorParticipant = requireParticipantEntity(chatId, actor.getId());

        GroupPolicy invitePolicy = GroupPolicy.fromString(chat.getWhoCanInvite(), GroupPolicy.ADMINS);
        requirePolicy(actorParticipant.groupRole(), invitePolicy, "You have no rights to invite participants");

        List<Long> rawIds = request == null ? List.of() : request.userIds();
        if (rawIds == null || rawIds.isEmpty()) {
            throw new ChatException("At least one user id is required");
        }

        List<Long> distinctIds = rawIds.stream().filter(Objects::nonNull).distinct().toList();
        if (distinctIds.isEmpty()) {
            throw new ChatException("At least one user id is required");
        }
        if (distinctIds.contains(actor.getId())) {
            throw new ChatException("You cannot invite yourself");
        }

        Set<Long> existingUserIds = participantRepository.findByChatId(chatId).stream()
                .map(ChatParticipant::getUserId)
                .collect(Collectors.toSet());
        List<Long> alreadyMembers = distinctIds.stream().filter(existingUserIds::contains).toList();
        if (!alreadyMembers.isEmpty()) {
            throw new ChatException("Some users are already group members");
        }

        List<User> usersToInvite = userRepository.findAllById(distinctIds);
        Set<Long> foundIds = usersToInvite.stream().map(User::getId).collect(Collectors.toSet());
        if (!foundIds.containsAll(distinctIds)) {
            throw new ChatException("One or more users not found");
        }

        List<ChatParticipant> added = usersToInvite.stream()
                .map(u -> new ChatParticipant(chatId, u.getId(), GroupRole.MEMBER))
                .toList();
        participantRepository.saveAll(added);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() -> {
            notifyChatListUpdated(username, chatId, "group_participants_invited");
            participantUsernames.forEach(u ->
                    notifyChatListUpdated(u, chatId, "group_participants_invited"));
        });

        return getChatForUser(username, chatId);
    }

    @Transactional
    public ChatResponse updateGroupSettings(String username, Long chatId, UpdateGroupSettingsRequest request) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        Chat chat = requireActiveGroup(chatId);
        ChatParticipant actorParticipant = requireParticipantEntity(chatId, actor.getId());

        GroupPolicy editPolicy = GroupPolicy.fromString(chat.getWhoCanEditInfo(), GroupPolicy.ADMINS);
        requirePolicy(actorParticipant.groupRole(), editPolicy, "You have no rights to edit group info");

        if (request.name() != null) {
            String normalizedName = request.name().trim();
            if (normalizedName.isBlank()) throw new ChatException("Group name is required");
            chat.setName(normalizedName);
        }
        if (request.avatarUrl() != null) {
            String avatar = request.avatarUrl().trim();
            chat.setAvatarUrl(avatar.isBlank() ? null : avatar);
        }
        if (request.bio() != null) {
            String bio = request.bio().trim();
            chat.setBio(bio.isBlank() ? null : bio);
        }
        chatRepository.save(chat);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        notifyChatListUpdated(u, chatId, "group_settings_updated")));

        return getChatForUser(username, chatId);
    }

    @Transactional
    public ChatResponse updateGroupParticipantRole(String username, Long chatId, Long targetUserId, UpdateGroupRoleRequest request) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        requireActiveGroup(chatId);

        participantRepository.findByChatIdForUpdate(chatId);
        ChatParticipant actorParticipant = requireParticipantEntity(chatId, actor.getId());
        ChatParticipant targetParticipant = requireParticipantEntity(chatId, targetUserId);
        GroupRole targetRole = parseRole(request.role());
        validateRoleChange(actorParticipant, targetParticipant, targetRole);

        if (targetRole == GroupRole.OWNER) {
            actorParticipant.setGroupRole(GroupRole.ADMIN);
            participantRepository.save(actorParticipant);
        }
        targetParticipant.setGroupRole(targetRole);
        participantRepository.save(targetParticipant);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        notifyChatListUpdated(u, chatId, "group_role_updated")));

        return getChatForUser(username, chatId);
    }

    @Transactional
    public ChatResponse updateGroupPermissions(String username, Long chatId, UpdateGroupPermissionsRequest request) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        Chat chat = requireActiveGroup(chatId);
        ChatParticipant actorParticipant = requireParticipantEntity(chatId, actor.getId());
        if (actorParticipant.groupRole() != GroupRole.OWNER) {
            throw new ChatException("Only owner can change group permissions");
        }

        if (request.whoCanWrite() != null) {
            chat.setWhoCanWrite(parsePolicy(request.whoCanWrite(), true).name());
        }
        if (request.whoCanEditInfo() != null) {
            chat.setWhoCanEditInfo(parsePolicy(request.whoCanEditInfo(), false).name());
        }
        if (request.whoCanInvite() != null) {
            chat.setWhoCanInvite(parsePolicy(request.whoCanInvite(), false).name());
        }
        chatRepository.save(chat);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        notifyChatListUpdated(u, chatId, "group_permissions_updated")));

        return getChatForUser(username, chatId);
    }

    @Transactional
    public void removeGroupParticipant(String username, Long chatId, Long targetUserId) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        requireActiveGroup(chatId);
        ChatParticipant actorParticipant = requireParticipantEntity(chatId, actor.getId());
        ChatParticipant targetParticipant = requireParticipantEntity(chatId, targetUserId);

        validateCanModerate(actorParticipant, targetParticipant, actor.getId(), "remove participants");

        participantRepository.delete(targetParticipant);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);
        TransactionUtils.afterCommit(() -> {
            notifyChatListUpdated(username, chatId, "group_participant_removed");
            participantUsernames.forEach(u ->
                    notifyChatListUpdated(u, chatId, "group_participant_removed"));
        });
    }

    @Transactional
    public void archiveGroup(String username, Long chatId) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        Chat chat = requireActiveGroup(chatId);
        ChatParticipant actorParticipant = requireParticipantEntity(chatId, actor.getId());
        if (actorParticipant.groupRole() != GroupRole.OWNER) {
            throw new ChatException("Only owner can delete group");
        }
        chat.setDeletedAt(LocalDateTime.now());
        chatRepository.save(chat);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        notifyChatListUpdated(u, chatId, "group_archived")));
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

        // Keep visibility rules consistent with getMyChats():
        if ("DIRECT".equals(chat.getType())) {
            String st = String.valueOf(chat.getDirectStatus());
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
                    savedChatName(),
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
                        if (u == null && p.getUserId().equals(currentUser.getId())) u = currentUser;
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

        // DIRECT
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

    // ── private ───────────────────────────────────────────────────────────────

    @Transactional
    public ChatResponse muteGroupParticipant(String username, Long chatId, Long targetUserId, Integer minutes) {
        if (minutes == null || minutes < 1 || minutes > 43200) {
            throw new ChatException("Mute duration must be between 1 and 43200 minutes");
        }
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        requireActiveGroup(chatId);
        ChatParticipant actorParticipant = requireParticipantEntity(chatId, actor.getId());
        ChatParticipant targetParticipant = requireParticipantEntity(chatId, targetUserId);
        validateCanModerate(actorParticipant, targetParticipant, actor.getId(), "mute participants");

        targetParticipant.setMutedUntil(LocalDateTime.now().plusMinutes(minutes));
        participantRepository.save(targetParticipant);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);

        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        notifyChatListUpdated(u, chatId, "group_participant_muted")));
        return getChatForUser(username, chatId);
    }

    @Transactional
    public ChatResponse unmuteGroupParticipant(String username, Long chatId, Long targetUserId) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        requireActiveGroup(chatId);
        ChatParticipant actorParticipant = requireParticipantEntity(chatId, actor.getId());
        ChatParticipant targetParticipant = requireParticipantEntity(chatId, targetUserId);
        validateCanModerate(actorParticipant, targetParticipant, actor.getId(), "unmute participants");

        targetParticipant.setMutedUntil(null);
        participantRepository.save(targetParticipant);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);
        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        notifyChatListUpdated(u, chatId, "group_participant_unmuted")));
        return getChatForUser(username, chatId);
    }

    @Transactional
    public ChatResponse banGroupParticipant(String username, Long chatId, Long targetUserId, String reason) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        requireActiveGroup(chatId);
        ChatParticipant actorParticipant = requireParticipantEntity(chatId, actor.getId());
        ChatParticipant targetParticipant = requireParticipantEntity(chatId, targetUserId);
        validateCanModerate(actorParticipant, targetParticipant, actor.getId(), "ban participants");

        targetParticipant.setBannedAt(LocalDateTime.now());
        targetParticipant.setBannedBy(actor.getId());
        targetParticipant.setBanReason(normalizeReason(reason));
        targetParticipant.setMutedUntil(null);
        participantRepository.save(targetParticipant);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);
        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        notifyChatListUpdated(u, chatId, "group_participant_banned")));
        return getChatForUser(username, chatId);
    }

    @Transactional
    public ChatResponse unbanGroupParticipant(String username, Long chatId, Long targetUserId) {
        User actor = userRepository.findByUsername(username).orElseThrow(() -> new ChatException("User not found"));
        requireActiveGroup(chatId);
        ChatParticipant actorParticipant = requireParticipantEntity(chatId, actor.getId());
        ChatParticipant targetParticipant = requireParticipantEntity(chatId, targetUserId);
        validateCanModerate(actorParticipant, targetParticipant, actor.getId(), "unban participants");

        targetParticipant.setBannedAt(null);
        targetParticipant.setBannedBy(null);
        targetParticipant.setBanReason(null);
        participantRepository.save(targetParticipant);
        List<String> participantUsernames = participantRepository.findDistinctUsernamesByChatId(chatId);
        TransactionUtils.afterCommit(() ->
                participantUsernames.forEach(u ->
                        notifyChatListUpdated(u, chatId, "group_participant_unbanned")));
        return getChatForUser(username, chatId);
    }

    private void notifyChatListUpdated(String username, Long chatId, String reason) {
        messagingTemplate.convertAndSend(
                "/topic/users/" + username + "/chats",
                ChatListUpdateEvent.forChat(chatId, reason)
        );
    }

    private void notifyRequestsUpdated(String username, Long chatId, String reason) {
        messagingTemplate.convertAndSend(
                "/topic/users/" + username + "/requests",
                ChatListUpdateEvent.forChat(chatId, reason)
        );
    }

    private Chat requireActiveGroup(Long chatId) {
        Chat chat = chatRepository.findById(chatId).orElseThrow(() -> new ChatException("Chat not found"));
        if (!"GROUP".equals(chat.getType())) throw new ChatException("Not a group chat");
        if (chat.getDeletedAt() != null) throw new ChatException("Group is archived");
        return chat;
    }

    private ChatParticipant requireParticipantEntity(Long chatId, Long userId) {
        return participantRepository.findByChatIdAndUserId(chatId, userId)
                .orElseThrow(() -> new ChatException("Not a chat participant"));
    }

    private void requirePolicy(GroupRole role, GroupPolicy policy, String message) {
        if (!role.atLeast(policy.minRole())) throw new ChatException(message);
    }

    private void validateRoleChange(ChatParticipant actor, ChatParticipant target, GroupRole targetRole) {
        GroupRole actorRole = actor.groupRole();
        GroupRole currentTargetRole = target.groupRole();
        if (actorRole == GroupRole.MEMBER) {
            throw new ChatException("You have no rights to change participant role");
        }
        if (actorRole == GroupRole.MODERATOR) {
            throw new ChatException("Moderators cannot change participant roles");
        }
        if (currentTargetRole == GroupRole.OWNER && actorRole != GroupRole.OWNER) {
            throw new ChatException("Owner role cannot be changed by non-owner");
        }
        if (targetRole == GroupRole.OWNER && actorRole != GroupRole.OWNER) {
            throw new ChatException("Only owner can transfer ownership");
        }
        if (actorRole == GroupRole.ADMIN) {
            if (currentTargetRole == GroupRole.ADMIN) {
                throw new ChatException("Admins cannot change roles of other admins");
            }
            if (targetRole == GroupRole.ADMIN) {
                throw new ChatException("Admins cannot assign admin role");
            }
        }
        if (!actorRole.atLeast(currentTargetRole) || !actorRole.atLeast(targetRole)) {
            throw new ChatException("You cannot assign or manage higher role than your own");
        }
    }

    private void validateCanModerate(ChatParticipant actor, ChatParticipant target, Long actorUserId, String action) {
        GroupRole actorRole = actor.groupRole();
        GroupRole targetRole = target.groupRole();
        if (Objects.equals(actor.getUserId(), target.getUserId()) || Objects.equals(actorUserId, target.getUserId())) {
            throw new ChatException("Self moderation actions are not allowed");
        }
        if (actorRole == GroupRole.MEMBER) {
            throw new ChatException("Members cannot " + action);
        }
        if (targetRole == GroupRole.OWNER) {
            throw new ChatException("Owner cannot be targeted by moderation actions");
        }
        if (actorRole == GroupRole.MODERATOR) {
            if (targetRole != GroupRole.MEMBER) {
                throw new ChatException("Moderators can only moderate members");
            }
            return;
        }
        if (actorRole == GroupRole.ADMIN && targetRole != GroupRole.MEMBER && targetRole != GroupRole.MODERATOR) {
            throw new ChatException("Admins cannot moderate owner/admin");
        }
        if (!actorRole.atLeast(targetRole)) {
            throw new ChatException("You can only moderate lower or equal roles");
        }
    }

    private String normalizeReason(String reason) {
        if (reason == null) return null;
        String normalized = reason.trim();
        if (normalized.isBlank()) return null;
        return normalized.length() > 255 ? normalized.substring(0, 255) : normalized;
    }

    private GroupRole parseRole(String role) {
        if (role == null || role.isBlank()) throw new ChatException("Role is required");
        try {
            return GroupRole.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ChatException("Unsupported role: " + role);
        }
    }

    private GroupPolicy parsePolicy(String value, boolean allowAllAlias) {
        if (value == null || value.isBlank()) throw new ChatException("Policy is required");
        try {
            GroupPolicy policy = GroupPolicy.valueOf(value.trim().toUpperCase());
            if (allowAllAlias && policy == GroupPolicy.ANYONE) return GroupPolicy.ALL;
            if (!allowAllAlias && policy == GroupPolicy.ALL) return GroupPolicy.ANYONE;
            return policy;
        } catch (IllegalArgumentException e) {
            throw new ChatException("Unsupported policy: " + value);
        }
    }
}
