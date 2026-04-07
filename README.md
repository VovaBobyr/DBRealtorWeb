# DBRealtor Web Portal

Read-only analytics portal for the [DBRealtor scraper](../DBRealtor). Connects
directly to the scraper's PostgreSQL database — it never scrapes anything itself.

## Stack

- **Backend**: FastAPI + SQLAlchemy async + asyncpg (Python 3.12)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v3
- **Charts**: Recharts
- **HTTP client**: TanStack Query
- **Reverse proxy**: Nginx
- **Containers**: Docker Compose

## Quick start (dev)

```bash
# 1. Copy env file — credentials must match the scraper's .env
cp .env.example .env
# Edit .env if your postgres credentials differ from defaults

# 2. Start everything
docker compose up

# App:      http://localhost:5173  (or http://localhost via nginx)
# API docs: http://localhost:8000/docs
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `sreality` | Postgres username |
| `POSTGRES_PASSWORD` | — | **Required.** Postgres password |
| `POSTGRES_DB` | `sreality` | Database name |
| `DATABASE_URL` | — | Full async DSN, e.g. `postgresql+asyncpg://sreality:pw@db:5432/sreality` |

## Running tests

Tests require a running Postgres instance:

```bash
# Start only the DB
docker compose up -d db

# Run backend tests
cd backend
DATABASE_URL="postgresql+asyncpg://sreality:changeme@localhost:5432/sreality" \
  python -m pytest tests/ -v
```

## Adding to the scraper's production compose

In `C:\Git\DBRealtor\docker-compose.prod.yml`, add:

```yaml
services:
  portal-backend:
    image: dbrealtor-web-backend:latest
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - default

  portal-nginx:
    image: nginx:1.27-alpine
    ports:
      - "8080:80"
    volumes:
      - /path/to/dbrealtor-web/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - portal-backend
    networks:
      - default
```

In production the frontend should be built (`npm run build`) and served as static
files by Nginx rather than the Vite dev server.

## Project layout

```
dbrealtor-web/
├── CLAUDE.md               ← project rules and conventions
├── docker-compose.yml      ← dev stack (includes its own DB for isolation)
├── .env.example
├── backend/
│   ├── src/
│   │   ├── main.py         ← FastAPI app
│   │   ├── database.py     ← async session dependency
│   │   ├── models.py       ← read-only ORM mirrors
│   │   └── routers/        ← one file per endpoint group
│   └── tests/
├── frontend/
│   └── src/
│       ├── api/            ← TanStack Query hooks
│       ├── components/     ← reusable UI
│       └── pages/          ← Dashboard, Trends, Listings, Alerts
└── nginx/
    └── nginx.conf
```
