package ru.messenger.chaosmessenger.message.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class SelfDestructScheduler {

    private static final long LOCK_KEY = 0x43484F53L;

    private final MessageRepository messageRepository;
    private final MessageOutboxService messageOutboxService;
    private final JdbcTemplate jdbcTemplate;

    @Scheduled(fixedRate = 30000)
    @Transactional
    public void deleteExpiredMessages() {
        Boolean locked = jdbcTemplate.queryForObject("SELECT pg_try_advisory_xact_lock(?)", Boolean.class, LOCK_KEY);
        if (!Boolean.TRUE.equals(locked)) {
            return;
        }

        List<Message> expired = messageRepository.findByExpiresAtBeforeAndDeletedAtIsNull(LocalDateTime.now());
        if (expired.isEmpty()) {
            return;
        }

        log.info("Self-destruct: deleting {} expired messages", expired.size());

        LocalDateTime now = LocalDateTime.now();
        expired.forEach(msg -> msg.setDeletedAt(now));
        messageRepository.saveAll(expired);

        Set<Long> affectedChatIds = expired.stream()
                .map(Message::getChatId)
                .collect(Collectors.toSet());

        expired.forEach(messageOutboxService::messageDeleted);
        affectedChatIds.forEach(chatId -> messageOutboxService.chatListUpdated(chatId, "message_deleted"));
    }
}
