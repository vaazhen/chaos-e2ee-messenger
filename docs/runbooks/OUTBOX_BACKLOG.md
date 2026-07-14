# Outbox Backlog Runbook

## Symptoms
- `chaos_outbox_oldest_pending_seconds` steadily increasing
- Messages delayed or not delivered via WebSocket
- Alert: `OutboxBacklogHigh` fires when pending > 60 seconds

## Metrics to check
- `chaos_outbox_pending_count` — current pending events
- `chaos_outbox_oldest_pending_seconds` — age of oldest pending event
- `chaos_outbox_dead_count` — events permanently failed
- `chaos_outbox_publish_latency_seconds` — publish operation duration
- `chaos_kafka_consumer_lag` — Kafka consumer lag

## Probable causes
1. Kafka broker unavailable or slow
2. Kafka topic partition leader election
3. Network partition between backend and Kafka
4. OutboxPublisher thread pool exhaustion
5. Database connection pool exhaustion during outbox query
6. Schema registry unavailable (if used)

## Safe actions
1. Check Kafka broker health: `kubectl get pods -n chaos-messenger | grep kafka`
2. Check Kafka topic: `kubectl exec -it kafka-0 -- kafka-topics --describe --topic chaos.message.events`
3. Check outbox query performance: DB slow query log for `SELECT * FROM outbox_events WHERE status = 'PENDING'`
4. Check publisher logs for Kafka connection errors
5. Restart outbox publisher (next scheduled run will recover)

## What NOT to do
- Do NOT manually clear the outbox table — events will be lost
- Do NOT delete Kafka topics — consumers will lose offsets
- Do NOT restart all backend pods simultaneously — outbox lock ownership will reset

## Recovery procedure
1. Verify Kafka connectivity: `kubectl exec -it backend-0 -- curl -s kafka:9092`
2. Verify topic exists: check Kafka UI or CLI
3. Check publisher thread: look for "acquireLock failed" warnings (another instance is publishing)
4. If stale lock: `UPDATE outbox_events SET status='PENDING', locked_at=NULL WHERE status='PROCESSING' AND locked_at < NOW() - INTERVAL '5 minutes'`
5. Monitor: `chaos_outbox_pending_count` should decrease after restore

## Post-recovery verification
- `chaos_outbox_pending_count` returns to near-zero
- WebSocket message delivery resumes
- No new `chaos_outbox_dead_count` increments
- Alert `OutboxBacklogHigh` resolves
