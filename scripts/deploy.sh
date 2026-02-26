#!/bin/bash
# ===========================================
# Newsroom AI - Deploy Script
# Run as deploy user from /opt/newsroom/app
# ===========================================
set -euo pipefail

APP_DIR="/opt/newsroom/app"
COMPOSE_FILE="docker-compose.prod.yml"
LOG_DIR="/opt/newsroom/logs"

cd "$APP_DIR"

echo "=== Newsroom AI Deploy ==="
echo "$(date '+%Y-%m-%d %H:%M:%S') Starting deployment..."

# 1. Pull latest code
echo "[1/5] Pulling latest code..."
git pull origin master

# 2. Build images
echo "[2/5] Building Docker images..."
docker compose -f "$COMPOSE_FILE" build

# 3. Run database migrations
echo "[3/5] Running migrations..."
docker compose -f "$COMPOSE_FILE" --profile migration run --rm migrate

# 4. Restart services
echo "[4/5] Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

# 5. Verify health
echo "[5/5] Verifying health..."
sleep 10
if curl -sf http://localhost:3000/api/health > /dev/null; then
    echo "App is healthy!"
else
    echo "WARNING: Health check failed. Check logs:"
    echo "  docker compose -f $COMPOSE_FILE logs app --tail=50"
    exit 1
fi

echo ""
echo "=== Deploy complete! ==="
echo "$(date '+%Y-%m-%d %H:%M:%S') Deployment finished." >> "$LOG_DIR/deploy.log"
