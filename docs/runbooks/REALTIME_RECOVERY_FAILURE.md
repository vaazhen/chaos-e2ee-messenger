# Realtime Recovery Failure Runbook

## Symptoms
- Alert `RealtimeRecoveryFailure` fires
- Users report missing messages after reconnect
- `chaos_realtime_recovery_failures_total` counter increasing
- `chaos_realtime_full_resync_total` counter increasing

## Probable causes
1. Cursor gap — durable event store has gap in sequence
2. Cursor expired — event store retention window exceeded
3. Client IndexedDB failure during message persistence
4. Decrypt failure on recovered message
5. Network timeout during recovery page fetch

## Safe actions
1. Check cursor health: `SELECT device_id, MAX(sequence), COUNT(*) FROM realtime_device_events GROUP BY device_id ORDER BY MAX(sequence) DESC LIMIT 20`
2. Check for gaps: look for missing sequence numbers per device
3. Check client logs for recovery errors (via telemetry if available)
4. Verify durable event store has recent events: query for events in last hour

## What NOT to do
- Do NOT truncate realtime_device_events — clients lose recovery ability
- Do NOT clear client cursors — they will resync from scratch
- Do NOT restart all backends simultaneously — recovery storms multiply

## Recovery procedure
1. If cursor expired (retention exceeded): client will automatically resync (FULL_RESYNC_REQUIRED)
2. If sequence gap: check if gap events exist in Kafka topic (consumer lag may have caused gap)
3. If IndexedDB failure: advise user to clear site data and re-login
4. If decrypt failure: check protocol version compatibility between client and sender
5. Monitor: recovery should succeed on next reconnect attempt

## Post-recovery verification
- `chaos_realtime_recovery_success_total` resumes incrementing
- `chaos_realtime_full_resync_total` stops increasing
- Users report message delivery restored
- Client cursors progressing normally
