#!/usr/bin/env bash
# Dump or restore Postgres. External HA is out of scope.
#
#   bash scripts/restore-drill.sh backup
#   CONFIRM_RESTORE=yes bash scripts/restore-drill.sh restore backups/file.sql
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p "$ROOT/backups"

ACTION="${1:-}"
TARGET="${2:-}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-chaos_messenger}"

if ! command -v pg_dump >/dev/null 2>&1 || ! command -v psql >/dev/null 2>&1; then
  echo "pg_dump and psql are required" >&2
  exit 2
fi

case "$ACTION" in
  backup)
    stamp="$(date -u +%Y%m%dT%H%M%SZ)"
    out="$ROOT/backups/chaos-messenger-${stamp}.sql"
    pg_dump --no-owner --no-acl -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" > "$out"
    echo "wrote $out"
    ;;
  restore)
    if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
      echo "set CONFIRM_RESTORE=yes to restore" >&2
      exit 2
    fi
    if [ ! -f "${TARGET:-}" ]; then
      echo "sql dump not found: ${TARGET:-}" >&2
      exit 2
    fi
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$TARGET"
    echo "restored $TARGET"
    ;;
  *)
    echo "usage: $0 backup | restore <file.sql>" >&2
    exit 2
    ;;
esac
