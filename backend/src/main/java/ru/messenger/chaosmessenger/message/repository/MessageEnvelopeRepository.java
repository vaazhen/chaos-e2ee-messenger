package ru.messenger.chaosmessenger.message.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.messenger.chaosmessenger.message.domain.MessageEnvelope;

import java.util.List;
import java.util.Optional;

public interface MessageEnvelopeRepository extends JpaRepository<MessageEnvelope, Long> {
    Optional<MessageEnvelope> findByMessageIdAndTargetDeviceId(Long messageId, String targetDeviceId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from MessageEnvelope e where e.messageId = :messageId")
    void deleteByMessageId(@Param("messageId") Long messageId);

    @Query("select e from MessageEnvelope e where e.messageId in :messageIds and e.targetDeviceId = :targetDeviceId")
    List<MessageEnvelope> findByMessageIdInAndTargetDeviceId(@Param("messageIds") java.util.List<Long> messageIds, @Param("targetDeviceId") String targetDeviceId);

    List<MessageEnvelope> findByChatIdAndTargetDeviceIdOrderByCreatedAtAsc(Long chatId, String targetDeviceId);
}
