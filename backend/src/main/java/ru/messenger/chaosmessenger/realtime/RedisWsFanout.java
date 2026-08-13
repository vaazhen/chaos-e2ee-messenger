package ru.messenger.chaosmessenger.realtime;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

/**
 * Cross-replica WebSocket fan-out. Each API pod publishes once; every pod
 * delivers locally only if it owns the matching STOMP session. The originating
 * instance skips its own Redis echo to avoid a double send.
 */
@Slf4j
@Component
public class RedisWsFanout implements MessageListener {

    public static final String CHANNEL = "chaos:ws:fanout";
    public static final String DEVICE = "DEVICE";
    public static final String USER = "USER";
    public static final String GLOBAL = "GLOBAL";

    private final RedisTemplate<String, String> redisTemplate;
    private final RedisMessageListenerContainer listenerContainer;
    private final ObjectMapper objectMapper;
    private final ObjectProvider<StompEventPublisher> stompEventPublisher;
    private final String instanceId;

    public RedisWsFanout(
            RedisTemplate<String, String> redisTemplate,
            RedisMessageListenerContainer listenerContainer,
            ObjectMapper objectMapper,
            ObjectProvider<StompEventPublisher> stompEventPublisher,
            @Value("${chaos.ws.instance-id}") String instanceId
    ) {
        this.redisTemplate = redisTemplate;
        this.listenerContainer = listenerContainer;
        this.objectMapper = objectMapper;
        this.stompEventPublisher = stompEventPublisher;
        this.instanceId = instanceId;
    }

    @PostConstruct
    void subscribe() {
        listenerContainer.addMessageListener(this, new ChannelTopic(CHANNEL));
    }

    public String instanceId() {
        return instanceId;
    }

    public void publishDevice(String deviceId, String suffix, Object payload) {
        publish(DEVICE, deviceId, suffix, payload);
    }

    public void publishUser(String username, String suffix, Object payload) {
        publish(USER, username, suffix, payload);
    }

    public void publishGlobal(String destination, Object payload) {
        publish(GLOBAL, "", destination, payload);
    }

    void publish(String kind, String routingKey, String destination, Object payload) {
        try {
            Envelope envelope = new Envelope(
                    instanceId,
                    kind,
                    routingKey == null ? "" : routingKey,
                    destination,
                    objectMapper.valueToTree(payload)
            );
            redisTemplate.convertAndSend(CHANNEL, objectMapper.writeValueAsString(envelope));
        } catch (Exception e) {
            log.warn("Redis WS fan-out publish failed kind={} dest={}: {}", kind, destination, e.toString());
        }
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        handleRaw(new String(message.getBody()));
    }

    void handleRaw(String json) {
        Envelope envelope;
        try {
            envelope = objectMapper.readValue(json, Envelope.class);
        } catch (Exception e) {
            log.warn("Redis WS fan-out payload ignored: {}", e.toString());
            return;
        }
        if (envelope == null || instanceId.equals(envelope.originInstanceId())) {
            return;
        }
        StompEventPublisher publisher = stompEventPublisher.getObject();
        JsonNode payload = envelope.payload() == null ? objectMapper.createObjectNode() : envelope.payload();
        switch (envelope.kind() == null ? "" : envelope.kind()) {
            case DEVICE -> publisher.deliverLocalToDevice(envelope.routingKey(), envelope.destination(), payload);
            case USER -> publisher.deliverLocalToUser(envelope.routingKey(), envelope.destination(), payload);
            case GLOBAL -> publisher.deliverLocalGlobal(envelope.destination(), payload);
            default -> log.warn("Redis WS fan-out unknown kind={}", envelope.kind());
        }
    }

    public record Envelope(
            String originInstanceId,
            String kind,
            String routingKey,
            String destination,
            JsonNode payload
    ) {
    }
}
