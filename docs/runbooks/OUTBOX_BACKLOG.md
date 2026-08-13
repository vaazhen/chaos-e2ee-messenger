# Outbox Backlog Runbook

## Symptoms
- `chaos_outbox_oldest_pending_seconds` steadily increasing
- Messages delayed or not delivered via WebSocket
- Alert: `OutboxBacklogHigh` fires when pending > 60 seconds

## Metrics to check
- `chaos_outbox_pending_count` — current pending events
- `chaos_outbox_oldest_pending_seconds` — age of oldest pending event
- `chaos_outbox_dead_count` — events permanently failed
- `chaos_outbox_publish_success_total` / `chaos_outbox_publish_failure_total`
- `chaos_kafka_consumer_success_total` — DomainEventProcessor throughput

## Probable causes
1. Kafka broker unavailable or slow
2. Kafka topic partition leader election
3. Network partition between backend and Kafka
4. Database connection pool exhaustion during outbox claim
5. Processor failure while appending `realtime_device_events`

## Safe actions
1. Check backend logs for `Outbox publish failed`
2. Check outbox query performance: DB slow query log for `outbox_events` claim
3. Check Kafka/Redpanda health and topic `chaos.message.events`
4. Restart one backend pod — SKIP LOCKED will recover remaining rows

## What NOT to do
- Do NOT manually clear the outbox table — events will be lost
- Do NOT delete Kafka topics — consumers will lose offsets
- Do NOT restart all backend pods simultaneously — in-flight PROCESSING rows wait for stale-lock recovery

## Recovery procedure
1. Confirm PostgreSQL is accepting connections
2. Confirm Kafka bootstrap connectivity from a backend pod
3. If stale lock: wait for `chaos.kafka.outbox.stale-lock-seconds` (default 120) or
   `UPDATE outbox_events SET status='PENDING', locked_at=NULL, locked_by=NULL WHERE status='PROCESSING' AND locked_at < NOW() - INTERVAL '5 minutes'`
4. Monitor: `chaos_outbox_pending_count` should decrease after restore

## Post-recovery verification
- `chaos_outbox_pending_count` returns to near-zero
- Clients recover via `/api/realtime/sync` even if live STOMP was missed
- No new `chaos_outbox_dead_count` increments
- Alert `OutboxBacklogHigh` resolves
