#!/usr/bin/env bash
# scripts/deploy.sh — run on the Contabo server to deploy / update the portal
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
HEALTH_URL="http://localhost/health"
MAX_ATTEMPTS=20

echo "==> Pulling latest code"
git pull origin main

echo "==> Building images"
docker compose -f "$COMPOSE_FILE" build

echo "==> Starting services"
docker compose -f "$COMPOSE_FILE" up -d

echo "==> Waiting for backend health check ($HEALTH_URL)"
for i in $(seq 1 $MAX_ATTEMPTS); do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo "    Backend is healthy (attempt $i)"
    break
  fi
  if [[ $i -eq $MAX_ATTEMPTS ]]; then
    echo "ERROR: Backend did not become healthy after $MAX_ATTEMPTS attempts."
    echo "       Check logs: docker compose -f $COMPOSE_FILE logs portal-backend"
    exit 1
  fi
  echo "    Attempt $i/$MAX_ATTEMPTS — waiting 3s..."
  sleep 3
done

SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "Portal available at http://$SERVER_IP"
