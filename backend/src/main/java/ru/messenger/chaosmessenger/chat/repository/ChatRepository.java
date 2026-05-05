package ru.messenger.chaosmessenger.chat.repository;

import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.EntityGraph;
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

    @Query("SELECT DISTINCT c FROM Chat c " +
            "LEFT JOIN FETCH c.participants p " +
            "LEFT JOIN FETCH p.user " +
            "WHERE c.id IN :ids")
    List<Chat> findByIdInWithParticipants(@Param("ids") List<Long> ids);

    @EntityGraph(attributePaths = {"participants", "participants.user"})
    Optional<Chat> findById(Long id);
}