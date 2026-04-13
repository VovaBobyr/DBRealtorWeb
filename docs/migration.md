# Portal Migration Runbook — Contabo Server

Migrating the DBRealtorWeb portal to the Contabo server where the DBRealtor
scraper already runs. The portal shares the scraper's existing PostgreSQL
container via a shared Docker network. No second database is needed.

## Server layout after migration

```
/opt/
├── DBRealtor/          ← scraper (already deployed)
│   └── docker-compose.yml   (owns the `db` postgres container)
└── DBRealtorWeb/       ← this project (portal)
    ├── docker-compose.prod.yml
    ├── .env
    └── scripts/deploy.sh
```

---

## Prerequisites

| Requirement | Min version | Check |
|---|---|---|
| Docker Engine | 24+ | `docker --version` |
| Docker Compose plugin | 2.20+ | `docker compose version` |
| Git | any | `git --version` |
| Port 80 open | — | firewall / Contabo security group |

If Docker is not installed:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

---

## Phase 1 — Verify scraper DB is running

The portal connects to the scraper's `db` container via the `sreality_default`
Docker network (the scraper's compose project name is `sreality`).
Make sure the network exists before deploying the portal.

```bash
cd /opt/sreality
docker compose ps          # db container must show "healthy" or "running"
docker network ls | grep sreality_default
```

If the network is missing, start the scraper DB:

```bash
docker compose up -d db
```

---

## Phase 2 — Clone the portal

```bash
cd /opt
git clone https://github.com/VovaBobyr/DBRealtorWeb.git
cd DBRealtorWeb
```

---

## Phase 3 — Configure environment

```bash
cp .env.example .env
nano .env
```

Fill in values that **must match** the scraper's `.env`:

```env
POSTGRES_USER=sreality
POSTGRES_PASSWORD=<same password as scraper>
POSTGRES_DB=sreality

# db = the scraper's postgres service name inside dbrealtor_default network
DATABASE_URL=postgresql+asyncpg://sreality:<same password>@db:5432/sreality
```

---

## Phase 4 — Deploy

```bash
chmod +x scripts/deploy.sh
bash scripts/deploy.sh
```

The script:
1. `git pull origin main`
2. `docker compose -f docker-compose.prod.yml build` — builds backend image and
   frontend static files (multi-stage Vite build inside Docker)
3. `docker compose -f docker-compose.prod.yml up -d` — starts `portal-backend`
   and `portal-nginx`
4. Polls `http://localhost/api/health` until the backend responds
5. Prints `Portal available at http://<SERVER_IP>`

First deploy takes ~3–5 min (npm install + Vite build inside Docker).
Subsequent deploys are faster (layer cache).

---

## Phase 5 — Verify deployment

```bash
# All portal containers are up
docker compose -f docker-compose.prod.yml ps
```

Expected output:

```
NAME              IMAGE                          STATUS
portal-backend    dbrealtor-portal-backend:latest  Up X seconds
portal-nginx      dbrealtor-portal-nginx:latest    Up X seconds
```

### Functional checks

| Check | Command | Expected |
|---|---|---|
| Backend health | `curl http://localhost/health` | `{"status":"ok"}` |
| Dashboard API | `curl http://localhost/api/dashboard/summary` | JSON with `total_listings`, `avg_price_czk`, etc. |
| React portal | Open `http://SERVER_IP` in browser | Portal loads, no blank page |
| Dashboard page | Navigate to `/` | 4 summary cards, last scrape timestamp |
| Trends page | Navigate to `/trends` | Locality/type dropdowns + line chart |
| Listings page | Navigate to `/listings` | Paginated table with search |
| Alerts page | Navigate to `/alerts` | New listings + price drops sections |

---

## Architecture (production)

```
Browser
  │
  ▼
portal-nginx :80  (container: dbrealtor-portal-nginx)
  │  /           → serves pre-built React static files (/usr/share/nginx/html)
  │  /api/       → proxy_pass → portal-backend:8000
  │  /health     → proxy_pass → portal-backend:8000
  ▼
portal-backend :8000  (container: dbrealtor-portal-backend)
  │  SQLAlchemy async, read-only queries
  ▼
db :5432  ← scraper's existing postgres container
           (joined via shared Docker network: dbrealtor_default)
```

Docker networks:
- `portal` — internal bridge between `portal-nginx` and `portal-backend`
- `scraper_network` (`dbrealtor_default`) — external network owned by the
  scraper's compose project; gives `portal-backend` access to `db`

---

## Ongoing updates

After pushing code changes from your dev machine:

```bash
# On the Contabo server
cd /opt/DBRealtorWeb
bash scripts/deploy.sh
```

Only changed Docker layers are rebuilt. A typical code-only update takes ~1 min.

---

## Logs

```bash
# All portal services
docker compose -f docker-compose.prod.yml logs -f

# Backend only
docker compose -f docker-compose.prod.yml logs portal-backend

# Nginx only
docker compose -f docker-compose.prod.yml logs portal-nginx
```

---

## Stop / restart

```bash
# Stop portal (does NOT affect scraper or DB)
docker compose -f docker-compose.prod.yml down

# Restart without rebuild
docker compose -f docker-compose.prod.yml up -d

# Force full rebuild + restart
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Firewall

Allow port 80 (Contabo control panel → Firewall, or `ufw`):

```bash
sudo ufw allow 80/tcp
sudo ufw reload
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `portal-backend` exits immediately | Wrong `DATABASE_URL` or wrong password | Check `.env` matches scraper `.env`; `docker compose logs portal-backend` |
| `network dbrealtor_default not found` | Scraper DB not running | `cd /opt/DBRealtor && docker compose up -d db` |
| `502 Bad Gateway` from nginx | Backend not ready yet | Wait 15s, refresh; check `docker compose logs portal-backend` |
| React portal loads blank page | Static build failed | `docker compose -f docker-compose.prod.yml build --no-cache portal-nginx` |
| API returns empty data | DB is empty | Trigger a scrape run in the scraper project |
| Health check times out in deploy.sh | Backend slow to start | Run `bash scripts/deploy.sh` again; check backend logs |

---

## What changed from the previous config

| File | Change |
|---|---|
| `docker-compose.prod.yml` | Port `8080→80`; network renamed to `scraper_network` with hardcoded name `sreality_default` (scraper project name is `sreality`) |
| `frontend/Dockerfile` | `node:22-alpine → node:20-alpine`; `nginx:1.27-alpine → nginx:alpine` |
| `nginx/nginx.prod.conf` | No changes — already correct |
| `scripts/deploy.sh` | Moved to `scripts/`; health check hits port 80 at `/api/health`; no `SCRAPER_NETWORK` detection (network name is hardcoded) |
