package ru.messenger.chaosmessenger.chat.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import ru.messenger.chaosmessenger.chat.repository.ChatParticipantRepository;
import ru.messenger.chaosmessenger.outbox.OutboxService;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatOutboxServiceTest {

    private ChatParticipantRepository participants;
    private OutboxService outboxService;
    private ChatOutboxService service;

    @BeforeEach
    void setUp() {
        participants = mock(ChatParticipantRepository.class);
        outboxService = mock(OutboxService.class);
        service = new ChatOutboxService(participants, outboxService);
        when(participants.findDistinctUsernamesByChatId(10L)).thenReturn(List.of("alice", "bob"));
    }

    @Test
    void chatCreatedUsesStableOneShotKeyAndChatAggregate() {
        service.chatListUpdated(10L, "chat_created");

        ArgumentCaptor<Map<String, Object>> payload = ArgumentCaptor.forClass(Map.class);
        verify(outboxService).write(
                eq("chat"),
                eq("10"),
                eq("CHAT_CREATED"),
                payload.capture(),
                isNull(),
                eq("chat:10:CHAT_CREATED")
        );
        assertThat(payload.getValue().get("participantUsernames")).isEqualTo(List.of("alice", "bob"));
        assertThat(payload.getValue().get("reason")).isEqualTo("chat_created");
    }

    @Test
    void requestCreatedUsesRequestAggregate() {
        service.requestUpdated(10L, "request_created");

        verify(outboxService).write(
                eq("request"),
                eq("10"),
                eq("REQUEST_CREATED"),
                org.mockito.ArgumentMatchers.any(),
                isNull(),
                eq("chat:10:REQUEST_CREATED")
        );
    }

    @Test
    void repeatableGroupInviteKeyIsNotOneShot() {
        service.chatListUpdated(10L, "group_participants_invited");

        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(outboxService).write(
                eq("chat"),
                eq("10"),
                eq("GROUP_PARTICIPANTS_INVITED"),
                org.mockito.ArgumentMatchers.any(),
                isNull(),
                key.capture()
        );
        assertThat(key.getValue()).matches("chat:10:GROUP_PARTICIPANTS_INVITED:\\d+");
    }
}
