package ru.messenger.chaosmessenger.message.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.messenger.chaosmessenger.chat.domain.Message;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByChatIdOrderByCreatedAtAsc(Long chatId);

    Optional<Message> findTopByChatIdOrderByCreatedAtDesc(Long chatId);

    Optional<Message> findBySenderIdAndSenderDeviceIdAndClientMessageId(
            Long senderId,
            String senderDeviceId,
            String clientMessageId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from Message m where m.id = :id")
    Optional<Message> findByIdForUpdate(@Param("id") Long id);

    @Query(value = """
            select distinct on (m.chat_id) *
            from messages m
            where m.chat_id in (:chatIds)
              and m.deleted_at is null
            order by m.chat_id, m.created_at desc, m.id desc
            """, nativeQuery = true)
    List<Message> findLatestByChatIds(@Param("chatIds") List<Long> chatIds);

    @Query("select m from Message m where m.chatId = :chatId and (:beforeId is null or m.id < :beforeId) order by m.id desc")
    List<Message> findByChatIdBefore(@Param("chatId") Long chatId,
                                      @Param("beforeId") Long beforeId,
                                      Pageable pageable);


    @Query("""
            select distinct m.senderId
            from Message m
            where m.chatId = :chatId
              and m.senderId <> :actorUserId
              and m.status = :status
              and m.deletedAt is null
            """)
    List<Long> findDistinctSenderIdsByChatIdAndSenderIdNotAndStatus(
            @Param("chatId") Long chatId,
            @Param("actorUserId") Long actorUserId,
            @Param("status") Message.MessageStatus status
    );

    @Query("""
            select distinct m.senderId
            from Message m
            where m.chatId = :chatId
              and m.senderId <> :actorUserId
              and m.status <> :status
              and m.deletedAt is null
            """)
    List<Long> findDistinctSenderIdsByChatIdAndSenderIdNotAndStatusNot(
            @Param("chatId") Long chatId,
            @Param("actorUserId") Long actorUserId,
            @Param("status") Message.MessageStatus status
    );

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            update messages m
            set status = case
                when not exists (
                    select 1
                    from chat_participants cp
                    where cp.chat_id = m.chat_id
                      and cp.user_id <> m.sender_id
                ) then 'SENT'
                when not exists (
                    select 1
                    from chat_participants cp
                    where cp.chat_id = m.chat_id
                      and cp.user_id <> m.sender_id
                      and not exists (
                          select 1
                          from message_receipts mr
                          where mr.message_id = m.id
                            and mr.user_id = cp.user_id
                            and mr.read_at is not null
                      )
                ) then 'READ'
                when exists (
                    select 1
                    from message_receipts mr
                    where mr.message_id = m.id
                      and mr.delivered_at is not null
                ) then 'DELIVERED'
                else 'SENT'
            end
            where m.chat_id = :chatId
              and m.sender_id <> :actorUserId
              and m.status <> 'READ'
              and m.deleted_at is null
            """, nativeQuery = true)
    int recalculateAggregateStatusesForChat(
            @Param("chatId") Long chatId,
            @Param("actorUserId") Long actorUserId
    );

    @Modifying
    @Query("update Message m set m.status = :newStatus where m.chatId = :chatId and m.senderId <> :userId and m.status = :currentStatus")
    int bulkUpdateStatusForChat(@Param("chatId") Long chatId,
                                @Param("userId") Long userId,
                                @Param("currentStatus") Message.MessageStatus currentStatus,
                                @Param("newStatus") Message.MessageStatus newStatus);

    long countByChatId(Long chatId);

    long countByChatIdAndSenderIdAndDeletedAtIsNull(Long chatId, Long senderId);

    List<Message> findByExpiresAtBeforeAndDeletedAtIsNull(LocalDateTime now);
}
