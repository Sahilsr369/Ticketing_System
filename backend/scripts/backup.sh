#!/usr/bin/env bash
set -e
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="it_ticketing_${TIMESTAMP}.sql.gz"
DB_URL="${DATABASE_URL:-postgresql://helpdesk:helpdesk_dev@localhost:5432/it_ticketing}"
mkdir -p "$BACKUP_DIR"
echo "[$(date '+%H:%M:%S')] Backing up → $BACKUP_DIR/$FILENAME"
pg_dump "$DB_URL" | gzip > "$BACKUP_DIR/$FILENAME"
echo "[$(date '+%H:%M:%S')] Done: $(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)"
cd "$BACKUP_DIR" && ls -t it_ticketing_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm --
