package ru.messenger.chaosmessenger.outbox;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OutboxIdsTest {

    @Test
    void oneShotChatReasonsAreStable() {
        assertThat(OutboxIds.chatKey(10L, "CHAT_CREATED")).isEqualTo("chat:10:CHAT_CREATED");
        assertThat(OutboxIds.chatKey(10L, "request_accepted")).isEqualTo("chat:10:REQUEST_ACCEPTED");
        assertThat(OutboxIds.eventKey("request", 10L, "request_accepted"))
                .isEqualTo("request:10:REQUEST_ACCEPTED");
        assertThat(OutboxIds.eventKey("request", 10L, "request_accepted"))
                .isNotEqualTo(OutboxIds.eventKey("chat", 10L, "request_accepted"));
        assertThat(OutboxIds.chatKey(10L, "request_created")).isEqualTo("chat:10:REQUEST_CREATED");
        assertThat(OutboxIds.chatKey(10L, "saved_chat_created")).isEqualTo("chat:10:SAVED_CHAT_CREATED");
        assertThat(OutboxIds.chatKey(10L, "chat_deleted_for_everyone")).isEqualTo("chat:10:CHAT_DELETED_FOR_EVERYONE");
    }

    @Test
    void repeatableChatReasonsStayUniqueEvenInTheSameMillisecond() {
        java.util.Set<String> keys = new java.util.HashSet<>();
        for (int i = 0; i < 200; i++) {
            keys.add(OutboxIds.chatKey(10L, "CHAT_LIST_UPDATED"));
        }

        assertThat(keys).hasSize(200);
        assertThat(keys).allSatisfy(key ->
                assertThat(key).startsWith("chat:10:CHAT_LIST_UPDATED:"));
    }

    @Test
    void repeatableChatReasonsIncludeADistinctSuffix() {
        String first = OutboxIds.chatKey(10L, "group_participants_invited");
        String second = OutboxIds.chatKey(10L, "group_participants_invited");

        assertThat(first).startsWith("chat:10:GROUP_PARTICIPANTS_INVITED:");
        assertThat(first).isNotEqualTo(second);
        assertThat(first).matches("chat:10:GROUP_PARTICIPANTS_INVITED:[0-9a-f-]{36}");
        assertThat(second).matches("chat:10:GROUP_PARTICIPANTS_INVITED:[0-9a-f-]{36}");
    }

    @Test
    void keyTruncatesToMaxLength() {
        String key = OutboxIds.key("a".repeat(200));
        assertThat(key).hasSize(150);
    }
}
