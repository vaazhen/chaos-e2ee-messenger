package ru.messenger.chaosmessenger.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RedisWsFanoutTest {

    private RedisTemplate<String, String> redisTemplate;
    private ObjectMapper objectMapper;
    private StompEventPublisher publisher;
    private RedisWsFanout fanout;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redisTemplate = mock(RedisTemplate.class);
        objectMapper = new ObjectMapper();
        publisher = mock(StompEventPublisher.class);
        ObjectProvider<StompEventPublisher> publisherProvider = mock(ObjectProvider.class);
        when(publisherProvider.getObject()).thenReturn(publisher);
        fanout = new RedisWsFanout(
                redisTemplate,
                mock(RedisMessageListenerContainer.class),
                objectMapper,
                publisherProvider,
                "node-a"
        );
    }

    @Test
    void publishWritesOriginAndPayloadToSharedChannel() throws Exception {
        ObjectNode payload = objectMapper.createObjectNode().put("type", "MESSAGE_CREATED");

        fanout.publishDevice("dev-a", "/chats/10", payload);

        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(redisTemplate).convertAndSend(eq(RedisWsFanout.CHANNEL), json.capture());

        RedisWsFanout.Envelope envelope = objectMapper.readValue(json.getValue(), RedisWsFanout.Envelope.class);
        assertThat(envelope.originInstanceId()).isEqualTo("node-a");
        assertThat(envelope.kind()).isEqualTo(RedisWsFanout.DEVICE);
        assertThat(envelope.routingKey()).isEqualTo("dev-a");
        assertThat(envelope.destination()).isEqualTo("/chats/10");
        assertThat(envelope.payload().get("type").asText()).isEqualTo("MESSAGE_CREATED");
    }

    @Test
    void ignoresOwnOriginToAvoidEchoLoop() throws Exception {
        fanout.handleRaw(objectMapper.writeValueAsString(new RedisWsFanout.Envelope(
                "node-a",
                RedisWsFanout.DEVICE,
                "dev-a",
                "/chats/10",
                objectMapper.createObjectNode()
        )));

        verifyNoInteractions(publisher);
    }

    @Test
    void deliversForeignDeviceEventToLocalBroker() throws Exception {
        ObjectNode payload = objectMapper.createObjectNode().put("type", "MESSAGE_CREATED");

        fanout.handleRaw(objectMapper.writeValueAsString(new RedisWsFanout.Envelope(
                "node-b",
                RedisWsFanout.DEVICE,
                "dev-a",
                "/chats/10",
                payload
        )));

        verify(publisher).deliverLocalToDevice(eq("dev-a"), eq("/chats/10"), eq(payload));
    }

    @Test
    void deliversForeignGlobalEventWithoutSessionCheck() throws Exception {
        ObjectNode payload = objectMapper.createObjectNode().put("username", "alice");

        fanout.handleRaw(objectMapper.writeValueAsString(new RedisWsFanout.Envelope(
                "node-b",
                RedisWsFanout.GLOBAL,
                "",
                "/topic/user/status",
                payload
        )));

        verify(publisher).deliverLocalGlobal(eq("/topic/user/status"), eq(payload));
    }
}
