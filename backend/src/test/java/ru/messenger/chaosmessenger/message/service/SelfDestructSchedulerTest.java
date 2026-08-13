package ru.messenger.chaosmessenger.message.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import ru.messenger.chaosmessenger.TestFixtures;
import ru.messenger.chaosmessenger.chat.domain.Message;
import ru.messenger.chaosmessenger.message.repository.MessageRepository;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SelfDestructSchedulerTest {

    private MessageRepository messageRepository;
    private MessageOutboxService messageOutboxService;
    private JdbcTemplate jdbcTemplate;
    private SelfDestructScheduler scheduler;

    @BeforeEach
    void setUp() {
        messageRepository = mock(MessageRepository.class);
        messageOutboxService = mock(MessageOutboxService.class);
        jdbcTemplate = mock(JdbcTemplate.class);
        scheduler = new SelfDestructScheduler(messageRepository, messageOutboxService, jdbcTemplate);
    }

    @Test
    void doesNotScanWhenAdvisoryLockIsHeldByAnotherNode() {
        when(jdbcTemplate.queryForObject("SELECT pg_try_advisory_xact_lock(?)", Boolean.class, 0x43484F53L))
                .thenReturn(false);

        scheduler.deleteExpiredMessages();

        verify(messageRepository, never()).findByExpiresAtBeforeAndDeletedAtIsNull(any());
        verify(messageOutboxService, never()).messageDeleted(any());
    }

    @Test
    void deletesExpiredMessagesAndWritesOutboxOncePerChat() {
        when(jdbcTemplate.queryForObject("SELECT pg_try_advisory_xact_lock(?)", Boolean.class, 0x43484F53L))
                .thenReturn(true);
        Message first = TestFixtures.sentMessage(1L, 10L, 1L, "dev-a");
        Message second = TestFixtures.sentMessage(2L, 10L, 2L, "dev-b");
        Message otherChat = TestFixtures.sentMessage(3L, 11L, 1L, "dev-a");
        when(messageRepository.findByExpiresAtBeforeAndDeletedAtIsNull(any(LocalDateTime.class)))
                .thenReturn(List.of(first, second, otherChat));

        scheduler.deleteExpiredMessages();

        verify(messageRepository).saveAll(List.of(first, second, otherChat));
        verify(messageOutboxService).messageDeleted(first);
        verify(messageOutboxService).messageDeleted(second);
        verify(messageOutboxService).messageDeleted(otherChat);
        verify(messageOutboxService).chatListUpdated(10L, "message_deleted");
        verify(messageOutboxService).chatListUpdated(11L, "message_deleted");
        org.assertj.core.api.Assertions.assertThat(first.getDeletedAt()).isNotNull();
        org.assertj.core.api.Assertions.assertThat(second.getDeletedAt()).isNotNull();
    }
}
