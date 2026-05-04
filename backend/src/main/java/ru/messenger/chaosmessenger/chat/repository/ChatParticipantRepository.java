package ru.messenger.chaosmessenger.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.messenger.chaosmessenger.chat.domain.ChatParticipant;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ChatParticipantRepository extends JpaRepository<ChatParticipant, Long> {

    List<ChatParticipant> findByUserId(Long userId);

    List<ChatParticipant> findByChatId(Long chatId);

    List<ChatParticipant> findByChatIdIn(Collection<Long> chatIds);

    @Query("select cp.userId from ChatParticipant cp where cp.chatId = :chatId")
    List<Long> findUserIdsByChatId(@Param("chatId") Long chatId);

    boolean existsByChatIdAndUserId(Long chatId, Long userId);

    @Query(value = """
            select distinct u.username
            from chat_participants cp
            join users u on u.id = cp.user_id
            where cp.chat_id = :chatId
            """, nativeQuery = true)
    List<String> findDistinctUsernamesByChatId(@Param("chatId") Long chatId);

    @Query(value = """
            select distinct u.username
            from chat_participants changed_participant
            join chat_participants recipient_participant
              on recipient_participant.chat_id = changed_participant.chat_id
            join users u on u.id = recipient_participant.user_id
            where changed_participant.user_id = :userId
            """, nativeQuery = true)
    List<String> findDistinctUsernamesSharingChatsWithUserId(@Param("userId") Long userId);

    @Query(value = """
            select c.id
            from chats c
            join chat_participants cp1 on cp1.chat_id = c.id
            join chat_participants cp2 on cp2.chat_id = c.id
            where c.type = 'DIRECT'
              and cp1.user_id = :userId1
              and cp2.user_id = :userId2
              and (
                  select count(*)
                  from chat_participants cp
                  where cp.chat_id = c.id
              ) = 2
            limit 1
            """, nativeQuery = true)
    Optional<Long> findDirectChatId(
            @Param("userId1") Long u1,
            @Param("userId2") Long u2
    );

    @Query(value = """
            select c.id
            from chats c
            join chat_participants cp on cp.chat_id = c.id
            where c.type = 'SAVED'
              and cp.user_id = :userId
              and (
                  select count(*)
                  from chat_participants cp2
                  where cp2.chat_id = c.id
              ) = 1
            limit 1
            """, nativeQuery = true)
    Optional<Long> findSavedChatId(
            @Param("userId") Long userId
    );
}
