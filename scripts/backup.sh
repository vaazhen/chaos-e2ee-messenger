#!/usr/bin/env bash
# === Chaos Messenger — Database Backup ===
# Usage:
#   bash scripts/backup.sh                    # interactive (prompts for password)
#   bash scripts/backup.sh /path/to/backups   # custom backup dir
#
# Add to crontab for hourly backups:
#   0 * * * * cd /opt/chaos-messenger && bash scripts/backup.sh /mnt/backups 2>>/var/log/chaos-backup.log

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="chaos_messenger_${TIMESTAMP}.sql.gz"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-chaos-e2ee-messenger}"

mkdir -p "$BACKUP_DIR"

# Get PG password from .env if it exists
if [ -f .env ]; then
  export $(grep -E '^POSTGRES_PASSWORD=' .env | xargs)
fi

echo "[$(date)] Starting backup -> $BACKUP_DIR/$FILENAME"

docker compose -p "$COMPOSE_PROJECT" exec -T postgres pg_dump \
  -U postgres chaos_messenger \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  | gzip > "$BACKUP_DIR/$FILENAME"

# Keep last 48 backups, delete older
find "$BACKUP_DIR" -name 'chaos_messenger_*.sql.gz' -type f -mtime +2 -delete

echo "[$(date)] Backup complete: $(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)"
echo "[$(date)] Backups retained: $(find "$BACKUP_DIR" -name 'chaos_messenger_*.sql.gz' -type f | wc -l)"
