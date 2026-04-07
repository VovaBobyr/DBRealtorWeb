# Deployment Plan

## Overview

The portal runs alongside the existing scraper on the same server, sharing its
PostgreSQL container. No second database is needed.

```
Server
├── /opt/DBRealtor          ← scraper project (already deployed)
│   └── docker-compose.yml  ← owns the `db` container
└── /opt/DBRealtorWeb       ← this project
    └── docker-compose.prod.yml  ← portal-backend + portal-nginx
```

---

## Prerequisites

| Requirement | Min version | Check |
|---|---|---|
| Linux server (Ubuntu 22.04+ recommended) | — | — |
| Docker Engine | 24+ | `docker --version` |
| Docker Compose plugin | 2.20+ | `docker compose version` |
| Git | any | `git --version` |
| Open port | 8080 (or 80) | firewall / security group |

### Install Docker (if not present)

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

---

## One-time server setup

### 1. Verify the scraper's DB is running

```bash
cd /opt/DBRealtor          # adjust path if different
docker compose ps          # db container must be running/healthy
```

If not running:

```bash
docker compose up -d db
```

### 2. Clone the portal

```bash
cd /opt
git clone https://github.com/VovaBobyr/DBRealtorWeb.git
cd DBRealtorWeb
```

### 3. Create .env

```bash
cp .env.example .env
nano .env
```

Fill in — credentials **must match** the scraper's `.env`:

```env
POSTGRES_USER=sreality
POSTGRES_PASSWORD=<your_password>
POSTGRES_DB=sreality

# db = service name inside the scraper's compose network
DATABASE_URL=postgresql+asyncpg://sreality:<your_password>@db:5432/sreality
```

### 4. Make deploy script executable

```bash
chmod +x deploy.sh
```

---

## Deploy (first time and every update)

```bash
cd /opt/DBRealtorWeb
bash deploy.sh
```

The script does automatically:
1. `git pull origin main`
2. Detects the scraper's Docker network name
3. `docker compose -f docker-compose.prod.yml build`
4. `docker compose -f docker-compose.prod.yml up -d`
5. Health-checks `http://localhost:8080/health`
6. Prints the server IP when done

Portal is available at: **`http://SERVER_IP:8080`**

---

## Manual deploy commands (if you prefer not to use the script)

```bash
cd /opt/DBRealtorWeb

# Pull latest
git pull origin main

# Find the scraper network (run once, save result)
docker network ls --format '{{.Name}}' | grep -E 'dbrealtor|sreality'
# e.g. output: dbrealtor_default

# Build
SCRAPER_NETWORK=dbrealtor_default \
  docker compose -f docker-compose.prod.yml build

# Start
SCRAPER_NETWORK=dbrealtor_default \
  docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8080/health
```

---

## Architecture (production)

```
Browser
  │
  ▼
portal-nginx :8080
  │  /           → serves pre-built React static files (from frontend/Dockerfile)
  │  /api/        → proxy_pass → portal-backend:8000
  │  /health      → proxy_pass → portal-backend:8000
  ▼
portal-backend :8000
  │  SQLAlchemy async (read-only)
  ▼
db :5432  ← scraper's existing postgres container
           (joined via shared Docker network)
```

Key difference from dev:
- **Dev**: nginx proxies `/` to the Vite dev server (`frontend:5173`)
- **Prod**: nginx serves pre-built static files from `/usr/share/nginx/html`
  (built inside `frontend/Dockerfile` via `npm run build`)

---

## Verify deployment

```bash
# All containers up
docker compose -f docker-compose.prod.yml ps

# Backend health
curl http://localhost:8080/health
# Expected: {"status":"ok"}

# API responding
curl "http://localhost:8080/api/dashboard/summary" | python3 -m json.tool

# Logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## Updates (after git push from dev machine)

```bash
cd /opt/DBRealtorWeb
bash deploy.sh
```

Only changed layers are rebuilt. Typical update takes ~1 minute.

---

## Stop / restart

```bash
# Stop
docker compose -f docker-compose.prod.yml down

# Restart without rebuild
docker compose -f docker-compose.prod.yml up -d

# Rebuild + restart
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Firewall

Allow port 8080 (or 80 if you change the mapping):

```bash
# ufw (Ubuntu)
sudo ufw allow 8080/tcp

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# AWS security group / GCP firewall rule — add inbound TCP 8080
```

---

## Optional: run on port 80 instead of 8080

In `docker-compose.prod.yml`, change:

```yaml
ports:
  - "80:80"    # was "8080:80"
```

Then allow port 80 in the firewall and access via `http://SERVER_IP`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `portal-backend` exits immediately | Wrong `DATABASE_URL` or scraper network not found | Check `.env`, re-run `deploy.sh` |
| `502 Bad Gateway` | Backend not ready yet | Wait 10s, refresh; check `docker compose logs portal-backend` |
| Empty data / no listings | Portal connected but DB is empty | Trigger a scrape run in the scraper project |
| `network not found` error | Scraper compose not running | `cd /opt/DBRealtor && docker compose up -d db` |
| Frontend shows blank page | Static build failed | Run `docker compose -f docker-compose.prod.yml build --no-cache` |
