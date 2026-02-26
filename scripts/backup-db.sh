#!/bin/bash
# ===========================================
# Newsroom AI - Database Backup
# Run as deploy user via cron
# Retention: 7 daily backups
# ===========================================
set -euo pipefail

BACKUP_DIR="/opt/newsroom/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Load env vars for DB credentials
APP_DIR="/opt/newsroom/app"
if [ -f "$APP_DIR/.env.production" ]; then
    export $(grep -E '^(DB_USER|DB_PASSWORD|DB_NAME)=' "$APP_DIR/.env.production" | xargs)
fi

DB_USER="${DB_USER:-newsroom}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-newsroom_db}"

mkdir -p "$BACKUP_DIR"

echo "$(date '+%Y-%m-%d %H:%M:%S') Starting backup..."

# Dump database (connecting to localhost:5432 exposed by docker-compose)
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h 127.0.0.1 \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --file="$BACKUP_DIR/newsroom_${TIMESTAMP}.dump"

echo "Backup created: newsroom_${TIMESTAMP}.dump"

# Clean old backups
find "$BACKUP_DIR" -name "newsroom_*.dump" -mtime +${RETENTION_DAYS} -delete

REMAINING=$(find "$BACKUP_DIR" -name "newsroom_*.dump" | wc -l)
echo "$(date '+%Y-%m-%d %H:%M:%S') Backup complete. $REMAINING backups retained."
