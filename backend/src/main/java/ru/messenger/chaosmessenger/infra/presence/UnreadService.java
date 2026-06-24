package ru.messenger.chaosmessenger.infra.presence;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class UnreadService {

    private final RedisTemplate<String, String> redisTemplate;

    public UnreadService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    private String key(Long userId, Long chatId) {
        return "unread:" + userId + ":" + chatId;
    }

    public void increment(Long userId, Long chatId) {
        redisTemplate.opsForValue().increment(key(userId, chatId));
    }

    public void reset(Long userId, Long chatId) {
        redisTemplate.delete(key(userId, chatId));
    }

    public long get(Long userId, Long chatId) {
        String value = redisTemplate.opsForValue().get(key(userId, chatId));
        return parseLongOrZero(value);
    }

    public Map<Long, Long> getMany(Long userId, Collection<Long> chatIds) {
        if (userId == null || chatIds == null || chatIds.isEmpty()) {
            return Map.of();
        }

        List<Long> ids = chatIds.stream().distinct().toList();
        List<String> keys = ids.stream().map(chatId -> key(userId, chatId)).toList();
        List<String> values = redisTemplate.opsForValue().multiGet(keys);

        Map<Long, Long> out = new HashMap<>();
        for (int i = 0; i < ids.size(); i++) {
            String v = (values != null && i < values.size()) ? values.get(i) : null;
            out.put(ids.get(i), parseLongOrZero(v));
        }
        return out;
    }

    private long parseLongOrZero(String value) {
        if (value == null) {
            return 0L;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}