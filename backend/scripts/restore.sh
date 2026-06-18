#!/usr/bin/env bash
set -e
BACKUP_FILE="$1"
DB_URL="${DATABASE_URL:-postgresql://helpdesk:helpdesk_dev@localhost:5432/it_ticketing}"
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: bash restore.sh /path/to/backup.sql.gz"; exit 1
fi
echo "WARNING: overwrites $DB_URL"
read -p "Type RESTORE to confirm: " CONFIRM
[ "$CONFIRM" = "RESTORE" ] || { echo "Aborted."; exit 0; }
gunzip -c "$BACKUP_FILE" | psql "$DB_URL"
echo "Restore complete."
