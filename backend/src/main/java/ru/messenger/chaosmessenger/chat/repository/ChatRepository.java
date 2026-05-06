package ru.messenger.chaosmessenger.chat.repository;

import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import ru.messenger.chaosmessenger.chat.domain.Chat;

import java.util.List;
import java.util.Optional;

public interface ChatRepository extends JpaRepository<Chat, Long> {

    List<Chat> findByIdIn(List<Long> ids);

    @Query(value = """
            select c.id
            from chats c
            join chat_participants cp
              on cp.chat_id = c.id
             and cp.user_id = :userId
            left join lateral (
                select m.created_at as last_message_at, m.id as last_message_id
                from messages m
                where m.chat_id = c.id
                  and m.deleted_at is null
                order by m.created_at desc nulls last, m.id desc
                limit 1
            ) lm on true
            order by lm.last_message_at desc nulls last, c.id desc
            limit :limit offset :offset
            """, nativeQuery = true)
    List<Long> findChatIdsByUserIdOrderByActivity(
            @Param("userId") Long userId,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    @Query(value = """
            select c.id
            from chats c
            join chat_participants cp
              on cp.chat_id = c.id
             and cp.user_id = :userId
            where c.type = 'DIRECT'
              and c.direct_status = 'PENDING'
              and (c.direct_requested_by is null or c.direct_requested_by <> :userId)
            order by c.created_at desc, c.id desc
            limit :limit offset :offset
            """, nativeQuery = true)
    List<Long> findPendingDirectRequestChatIdsForUser(
            @Param("userId") Long userId,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    @Query("SELECT DISTINCT c FROM Chat c " +
            "LEFT JOIN FETCH c.participants p " +
            "LEFT JOIN FETCH p.user " +
            "WHERE c.id IN :ids")
    List<Chat> findByIdInWithParticipants(@Param("ids") List<Long> ids);

    @Query("select c from Chat c left join fetch c.participants p left join fetch p.user where c.id = :id")
    Optional<Chat> findByIdWithParticipants(@Param("id") Long id);
}