# Backup and restore

This is a drill, not HA Postgres. Production Postgres is external to this
kustomization. The in-repo `k8s/postgres.yaml` is a single replica for demos.

## Backup

```bash
bash scripts/restore-drill.sh backup
```

Writes `backups/chaos-messenger-<utc>.sql` via `pg_dump` against
`SPRING_DATASOURCE_*` or `DATABASE_URL`.

## Restore (staging only)

```bash
bash scripts/restore-drill.sh restore backups/chaos-messenger-<utc>.sql
```

Requires `CONFIRM_RESTORE=yes`. Do not run this against production without
a snapshot of the current volume.

## After restore

1. Backend readiness `UP`
2. Flyway at the expected version
3. `bash scripts/delivery-drill.sh` — outbox pending = 0, sync works
4. One device can decrypt a new saved-chat event

## What this does not prove

Failover to a replica, PITR, or Redis/Kafka cluster recovery. Those stay
on `PROD-HA`.
