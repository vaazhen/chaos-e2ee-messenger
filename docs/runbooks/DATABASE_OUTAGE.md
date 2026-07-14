# Database Outage Runbook

## Symptoms
- Backend health checks failing: `/actuator/health/readiness` returns DOWN
- Error logs: "Unable to acquire JDBC Connection", "HikariPool-1 - Connection is not available"
- Alert `DatabaseUnavailable` fires

## Probable causes
1. PostgreSQL pod crashed or restarted
2. Database connection pool exhaustion
3. Network partition between backend and PostgreSQL
4. Long-running query blocking connections
5. Disk full on PostgreSQL volume

## Safe actions
1. Check DB pod: `kubectl get pods -n chaos-messenger | grep postgres`
2. Check DB logs: `kubectl logs postgres-0 -n chaos-messenger --tail=100`
3. Check connection pool: `/actuator/metrics/hikaricp.connections.active`
4. Check disk: `kubectl exec -it postgres-0 -- df -h /var/lib/postgresql/data`

## What NOT to do
- Do NOT restart PostgreSQL if replication is lagging — data loss risk
- Do NOT delete PVC — irreversible data loss
- Do NOT run `VACUUM FULL` during high load — locks entire table

## Recovery procedure
1. If pod crashed: wait for automatic restart (StatefulSet controller)
2. If connection pool exhausted: temporarily increase `spring.datasource.hikari.maximumPoolSize`
3. If network issue: verify service endpoints `kubectl get endpoints chaos-postgres`
4. If disk full: extend PVC or clean up old WAL files
5. If DB unrecoverable: restore from latest PITR backup

## Post-recovery verification
- `/actuator/health/readiness` returns UP
- Connection pool returns to normal levels
- No pending transactions stuck
- Flyway migration status confirmed
- Replication lag caught up (if replica exists)
