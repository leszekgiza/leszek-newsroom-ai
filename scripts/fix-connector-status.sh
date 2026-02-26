#!/bin/bash
set -euo pipefail

echo "=== Fix: Add ConnectorStatus fields ==="

APP_DIR="/opt/newsroom/app"
COMPOSE_FILE="docker-compose.prod.yml"

# Load DB credentials
source <(grep -E '^DB_USER=|^DB_NAME=|^DB_PASSWORD=' "$APP_DIR/.env.production" | sed 's/^/export /')

DB_CONTAINER=$(docker ps -qf "ancestor=postgres:16-alpine")

if [ -z "$DB_CONTAINER" ]; then
  echo "ERROR: Postgres container not found!"
  exit 1
fi

echo "[1/3] Running SQL migration..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConnectorStatus') THEN
    CREATE TYPE "ConnectorStatus" AS ENUM ('CONNECTED', 'SYNCING', 'ERROR', 'EXPIRED', 'DISCONNECTED');
    RAISE NOTICE 'Created ConnectorStatus enum';
  ELSE
    RAISE NOTICE 'ConnectorStatus enum already exists';
  END IF;
END $$;

ALTER TABLE "private_sources" ADD COLUMN IF NOT EXISTS "status" "ConnectorStatus" NOT NULL DEFAULT 'DISCONNECTED';
ALTER TABLE "private_sources" ADD COLUMN IF NOT EXISTS "sync_interval" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "private_sources" ADD COLUMN IF NOT EXISTS "last_sync_error" TEXT;

INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
SELECT gen_random_uuid(), 'manual', '20260226130000_add_connector_status_fields', NOW(), NOW(), 1
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260226130000_add_connector_status_fields'
);
SQL
echo "[1/3] Done."

echo "[2/3] Restarting app..."
cd "$APP_DIR" && docker compose -f "$COMPOSE_FILE" restart app

echo "[3/3] Waiting 30s and checking health..."
sleep 30
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/sources/private)
echo "Response code: $HTTP_CODE"

if [ "$HTTP_CODE" = "500" ]; then
  echo "FAIL: Still getting 500!"
  exit 1
else
  echo "SUCCESS: Endpoint works (got $HTTP_CODE)"
fi

echo "=== Done! ==="
