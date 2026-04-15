#!/usr/bin/env bash
# deploy.sh — run on the server after git pull
set -euo pipefail

echo "==> Pulling latest code"
git pull origin main

echo "==> Finding scraper Docker network"
# The scraper's compose project is in ../DBRealtor — get its network name
SCRAPER_NETWORK=$(docker network ls --format '{{.Name}}' | grep -E 'dbrealtor|sreality' | grep default | head -1)
if [[ -z "$SCRAPER_NETWORK" ]]; then
  echo "ERROR: Could not find scraper Docker network. Is the scraper running?"
  echo "       Run: cd ../DBRealtor && docker compose up -d db"
  exit 1
fi
echo "    Using network: $SCRAPER_NETWORK"

echo "==> Building images"
SCRAPER_NETWORK="$SCRAPER_NETWORK" docker compose -f docker-compose.prod.yml build

echo "==> Starting services"
SCRAPER_NETWORK="$SCRAPER_NETWORK" docker compose -f docker-compose.prod.yml up -d

echo "==> Waiting for backend health check"
for i in $(seq 1 15); do
  if curl -sf http://localhost:80/health > /dev/null 2>&1; then
    echo "    Backend is healthy"
    break
  fi
  echo "    Attempt $i/15 — waiting..."
  sleep 2
done

echo ""
echo "Done. Portal available at http://$(hostname -I | awk '{print $1}')"
