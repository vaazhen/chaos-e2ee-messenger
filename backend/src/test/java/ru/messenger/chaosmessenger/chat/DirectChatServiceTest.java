package ru.messenger.chaosmessenger.chat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.messenger.chaosmessenger.TestFixtures;
import ru.messenger.chaosmessenger.chat.access.ChatAccessService;
import ru.messenger.chaosmessenger.chat.domain.Chat;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.chat.repository.ChatRepository;
import ru.messenger.chaosmessenger.chat.service.ChatOutboxService;
import ru.messenger.chaosmessenger.chat.service.DirectChatService;
import ru.messenger.chaosmessenger.common.exception.ChatException;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.repository.UserRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DirectChatService")
class DirectChatServiceTest {

    @Mock UserRepository userRepository;
    @Mock ChatRepository chatRepository;
    @Mock ChatParticipantRepository participantRepository;
    @Mock ChatAccessService chatAccessService;
    @Mock ChatOutboxService chatOutboxService;

    @InjectMocks DirectChatService directChatService;

    User alice;
    User bob;

    @BeforeEach
    void setUp() {
        alice = TestFixtures.user(1L, "alice");
        bob = TestFixtures.user(2L, "bob");
    }

    @Nested
    @DisplayName("createDirectChat")
    class CreateDirectChat {

        @Test
        @DisplayName("creates a new chat when it does not exist yet")
        void createsNewChat() {
            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
            when(userRepository.findById(2L)).thenReturn(Optional.of(bob));
            when(chatRepository.findActiveDirectByNormalizedPair(1L, 2L)).thenReturn(Optional.empty());
            when(participantRepository.findDirectChatId(1L, 2L)).thenReturn(Optional.empty());

            Chat saved = TestFixtures.directChat(10L);
            when(chatRepository.save(any())).thenReturn(saved);

            Long chatId = directChatService.createDirectChat("alice", 2L);

            assertThat(chatId).isEqualTo(10L);
            verify(chatRepository).save(any());
            verify(participantRepository, times(2)).save(any());
        }

        @Test
        @DisplayName("returns an existing chat without duplication")
        void returnsExistingChat() {
            Chat existing = TestFixtures.directChat(99L);
            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
            when(userRepository.findById(2L)).thenReturn(Optional.of(bob));
            when(chatRepository.findActiveDirectByNormalizedPair(1L, 2L)).thenReturn(Optional.of(existing));
            when(chatRepository.findById(99L)).thenReturn(Optional.of(existing));

            Long chatId = directChatService.createDirectChat("alice", 2L);

            assertThat(chatId).isEqualTo(99L);
            verify(chatRepository, times(1)).save(any());
        }

        @Test
        @DisplayName("rejects creating a chat with yourself")
        void rejectsSelfChat() {
            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
            when(userRepository.findById(1L)).thenReturn(Optional.of(alice));

            assertThatThrownBy(() -> directChatService.createDirectChat("alice", 1L))
                    .isInstanceOf(ChatException.class)
                    .hasMessageContaining("yourself");
        }

        @Test
        @DisplayName("throws ChatException when target user is not found")
        void throwsIfTargetNotFound() {
            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> directChatService.createDirectChat("alice", 999L))
                    .isInstanceOf(ChatException.class);
        }
    }
}
