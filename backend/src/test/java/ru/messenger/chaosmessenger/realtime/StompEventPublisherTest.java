package ru.messenger.chaosmessenger.realtime;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class StompEventPublisherTest {

    private SimpMessagingTemplate messagingTemplate;
    private WebSocketSessionRegistry sessionRegistry;
    private RedisWsFanout redisWsFanout;
    private StompEventPublisher publisher;

    @BeforeEach
    void setUp() {
        messagingTemplate = mock(SimpMessagingTemplate.class);
        sessionRegistry = new WebSocketSessionRegistry();
        redisWsFanout = mock(RedisWsFanout.class);
        publisher = new StompEventPublisher(
                messagingTemplate,
                sessionRegistry,
                redisWsFanout,
                new SimpleMeterRegistry()
        );
    }

    @Test
    void publishToDeviceDeliversLocallyWhenSessionExistsAndAlwaysPublishesRedis() {
        sessionRegistry.register("s1", "alice", "dev-a");
        Map<String, Object> payload = Map.of("type", "MESSAGE_CREATED");

        publisher.publishToDevice("dev-a", "/chats/10", payload);

        verify(messagingTemplate).convertAndSend("/topic/devices/dev-a/chats/10", payload);
        verify(redisWsFanout).publishDevice("dev-a", "/chats/10", payload);
    }

    @Test
    void publishToDeviceSkipsLocalBrokerWhenSessionIsOnAnotherReplica() {
        Map<String, Object> payload = Map.of("type", "MESSAGE_CREATED");

        publisher.publishToDevice("dev-a", "/chats/10", payload);

        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
        verify(redisWsFanout).publishDevice("dev-a", "/chats/10", payload);
    }

    @Test
    void publishToUserRequiresLocalSession() {
        sessionRegistry.register("s1", "alice", "dev-a");
        Map<String, Object> payload = Map.of("reason", "profile_updated");

        publisher.publishToUser("alice", "/chats", payload);
        publisher.publishToUser("bob", "/chats", payload);

        verify(messagingTemplate).convertAndSend("/topic/users/alice/chats", payload);
        verify(messagingTemplate, never()).convertAndSend("/topic/users/bob/chats", payload);
        verify(redisWsFanout).publishUser("alice", "/chats", payload);
        verify(redisWsFanout).publishUser("bob", "/chats", payload);
    }
}
