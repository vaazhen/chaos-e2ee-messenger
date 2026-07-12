package ru.messenger.chaosmessenger.realtime;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import ru.messenger.chaosmessenger.realtime.dto.RealtimeSyncEvent;
import ru.messenger.chaosmessenger.realtime.dto.RealtimeSyncResponse;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class RealtimeEventStore {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    @Value("${chaos.realtime.retention:PT168H}")
    private Duration retention;

    @Transactional
    public ObjectNode append(String deviceId, String eventId, String destination, ObjectNode payload) {
        if (deviceId == null || deviceId.isBlank() || eventId == null || eventId.isBlank()) {
            return payload;
        }
        String json = writeJson(payload);
        Long sequence = jdbcTemplate.queryForObject("""
                WITH inserted AS (
                    INSERT INTO realtime_device_events(device_id, event_id, destination, payload)
                    VALUES (?, ?, ?, CAST(? AS jsonb))
                    ON CONFLICT (device_id, event_id, destination) DO NOTHING
                    RETURNING sequence
                )
                SELECT sequence FROM inserted
                UNION ALL
                SELECT sequence FROM realtime_device_events
                 WHERE device_id = ? AND event_id = ? AND destination = ?
                LIMIT 1
                """, Long.class, deviceId, eventId, destination, json,
                deviceId, eventId, destination);
        ObjectNode result = payload.deepCopy();
        if (sequence != null) {
            result.put("sequence", sequence);
        }
        result.put("eventId", eventId);
        return result;
    }

    @Transactional(readOnly = true)
    public RealtimeSyncResponse readAfter(String deviceId, long after, int requestedLimit) {
        int limit = Math.max(1, Math.min(requestedLimit, 500));
        List<RealtimeSyncEvent> rows = jdbcTemplate.query("""
                SELECT sequence, event_id, destination, payload::text, created_at
                  FROM realtime_device_events
                 WHERE device_id = ? AND sequence > ?
                 ORDER BY sequence ASC
                 LIMIT ?
                """, (rs, rowNum) -> new RealtimeSyncEvent(
                rs.getLong("sequence"),
                rs.getString("event_id"),
                rs.getString("destination"),
                readJson(rs.getString("payload")),
                rs.getTimestamp("created_at").toInstant()
        ), deviceId, Math.max(0, after), limit + 1);

        boolean hasMore = rows.size() > limit;
        List<RealtimeSyncEvent> page = hasMore ? rows.subList(0, limit) : rows;
        long nextCursor = page.isEmpty() ? Math.max(0, after) : page.get(page.size() - 1).sequence();
        return new RealtimeSyncResponse(List.copyOf(page), nextCursor, hasMore);
    }

    @Scheduled(cron = "${chaos.realtime.cleanup-cron:0 17 * * * *}")
    public void deleteExpired() {
        Duration safeRetention = retention == null || retention.isNegative() || retention.isZero()
                ? Duration.ofDays(7)
                : retention;
        Instant cutoff = Instant.now().minus(safeRetention);
        jdbcTemplate.update("DELETE FROM realtime_device_events WHERE created_at < ?", Timestamp.from(cutoff));
    }

    private String writeJson(JsonNode payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Cannot serialize realtime event", e);
        }
    }

    private JsonNode readJson(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Stored realtime event is invalid", e);
        }
    }
}
