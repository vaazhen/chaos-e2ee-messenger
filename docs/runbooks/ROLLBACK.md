# Rollback Runbook

## When to rollback
- Error rate exceeds 5% after deploy
- Decrypt failure rate spikes after protocol change
- WebSocket connection failures increase
- Database migration fails or corrupts data
- Critical security vulnerability discovered in new release

## Pre-rollback checklist
1. Identify the problematic deployment: `kubectl rollout history deployment/chaos-backend -n chaos-messenger`
2. Confirm bad revision: check logs, metrics, alerts
3. Notify team in incident channel

## Rollback procedure
```bash
# Backend rollback to previous revision
kubectl rollout undo deployment/chaos-backend -n chaos-messenger

# Frontend rollback
kubectl rollout undo deployment/chaos-frontend -n chaos-messenger

# Verify rollback started
kubectl rollout status deployment/chaos-backend -n chaos-messenger --timeout=5m
kubectl rollout status deployment/chaos-frontend -n chaos-messenger --timeout=5m
```

## Database migration rollback
- Flyway migrations are forward-only. Cannot undo.
- If migration failed: fix the migration script, deploy fix forward
- If migration succeeded but corrupted data: restore from PITR backup
- NEVER manually modify Flyway schema history table

## Secret/key rotation during rollback
- JWT secret: unchanged during rollback (same key continues working)
- Refresh tokens: rotation within same family continues
- Pre-keys: devices re-upload pre-keys on next connection
- Session keys: not affected (stored client-side)

## Post-rollback verification
- `/actuator/health/readiness` returns UP
- Error rate returns to baseline
- WebSocket reconnection rate normal
- Message delivery resumes
- Alert storm resolves
- Team notified of rollback completion

## Post-incident review
1. Document root cause
2. Update runbook if new failure mode discovered
3. Add regression test
4. Consider canary deployment to catch issues earlier
