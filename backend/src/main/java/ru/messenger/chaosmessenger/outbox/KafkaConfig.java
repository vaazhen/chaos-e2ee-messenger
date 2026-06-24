package ru.messenger.chaosmessenger.outbox;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;
import org.springframework.util.backoff.ExponentialBackOff;

import java.util.HashMap;
import java.util.Map;

@Configuration
@ConditionalOnProperty(name = "chaos.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class KafkaConfig {

    public static final String MESSAGE_EVENTS_TOPIC = "chaos.message.events";
    public static final String CHAT_EVENTS_TOPIC = "chaos.chat.events";
    public static final String RECEIPT_EVENTS_TOPIC = "chaos.receipt.events";
    public static final String USER_EVENTS_TOPIC = "chaos.user.events";
    public static final String PUSH_EVENTS_TOPIC = "chaos.push.events";
    public static final String SECURITY_EVENTS_TOPIC = "chaos.security.events";
    public static final String AUDIT_EVENTS_TOPIC = "chaos.audit.events";
    public static final String DEAD_LETTER_EVENTS_TOPIC = "chaos.dead-letter.events";

    @Value("${chaos.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Value("${chaos.kafka.consumer-group:chaos-workers}")
    private String consumerGroup;

    @Value("${chaos.kafka.topic.replicas:1}")
    private int replicas;

    @Bean
    public NewTopic messageEventsTopic() {
        return topic(MESSAGE_EVENTS_TOPIC, 6);
    }

    @Bean
    public NewTopic chatEventsTopic() {
        return topic(CHAT_EVENTS_TOPIC, 6);
    }

    @Bean
    public NewTopic receiptEventsTopic() {
        return topic(RECEIPT_EVENTS_TOPIC, 6);
    }

    @Bean
    public NewTopic userEventsTopic() {
        return topic(USER_EVENTS_TOPIC, 3);
    }

    @Bean
    public NewTopic pushEventsTopic() {
        return topic(PUSH_EVENTS_TOPIC, 6);
    }

    @Bean
    public NewTopic securityEventsTopic() {
        return topic(SECURITY_EVENTS_TOPIC, 3);
    }

    @Bean
    public NewTopic auditEventsTopic() {
        return topic(AUDIT_EVENTS_TOPIC, 3);
    }

    @Bean
    public NewTopic deadLetterEventsTopic() {
        return topic(DEAD_LETTER_EVENTS_TOPIC, 3);
    }

    @Bean
    public ProducerFactory<String, DomainEvent> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 10);
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
        props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120_000);
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 30_000);
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");
        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public KafkaTemplate<String, DomainEvent> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }

    @Bean
    public ConsumerFactory<String, DomainEvent> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, consumerGroup);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "ru.messenger.chaosmessenger.outbox");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 100);
        return new DefaultKafkaConsumerFactory<>(props);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, DomainEvent> kafkaListenerContainerFactory(
            KafkaTemplate<String, DomainEvent> kafkaTemplate
    ) {
        ConcurrentKafkaListenerContainerFactory<String, DomainEvent> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        factory.setCommonErrorHandler(defaultErrorHandler(kafkaTemplate));
        return factory;
    }

    private NewTopic topic(String name, int partitions) {
        return TopicBuilder.name(name)
                .partitions(partitions)
                .replicas(replicas)
                .build();
    }

    private DefaultErrorHandler defaultErrorHandler(KafkaTemplate<String, DomainEvent> kafkaTemplate) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                kafkaTemplate,
                (record, exception) -> new TopicPartition(DEAD_LETTER_EVENTS_TOPIC, record.partition())
        );
        ExponentialBackOff backOff = new ExponentialBackOff(1_000, 2.0);
        backOff.setMaxInterval(30_000);
        backOff.setMaxElapsedTime(120_000);
        return new DefaultErrorHandler(recoverer, backOff);
    }
}
