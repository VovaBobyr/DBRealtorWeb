# Build progress

## Step 1 — CLAUDE.md ✅
- [x] Project purpose and stack summary
- [x] Schema reference to `../DBRealtor/docs/architecture.md` (relative path — was absolute Windows path, fixed 2026-04-15)
- [x] Hard rules: read-only backend, async ORM, strict TypeScript, no `any`
- [x] How to run and how to test
- [x] `scrape_run_summary` view documented in schema section (added 2026-04-15)

## Step 2 — Backend scaffold ✅
- [x] `pyproject.toml` with all required dependencies
- [x] `Dockerfile` — python:3.12-slim, non-root user
- [x] `src/main.py` — FastAPI app with CORS, /health, routers included
- [x] `src/database.py` — async engine + `get_session()` dependency
- [x] `src/models.py` — read-only ORM mirrors of scraper schema

## Step 3 — Backend routers + tests ✅
- [x] `GET /api/dashboard/summary` — total, new today, avg Praha price, last run
- [x] `GET /api/trends/price` — monthly avg by locality + type + months
- [x] `GET /api/listings` — paginated, filterable, sortable
- [x] `GET /api/alerts` — new listings + price drops
- [x] `tests/test_routers.py` — shape tests for all endpoints
- [ ] All 14 tests passing (blocked: Docker Desktop not running — 5/14 pass without DB)

## Step 4 — Frontend scaffold ✅
- [x] Vite + React 18 + TypeScript (strict mode)
- [x] Tailwind CSS v3
- [x] TanStack Query provider
- [x] React Router v6 with 4 routes
- [x] `src/api/` — useDashboard, useTrends, useListings, useAlerts hooks
- [x] TypeScript compiles clean (`tsc --noEmit` passes)

## Step 5 — Frontend pages ✅
- [x] Dashboard — 4 summary cards, scrape status green/red, last updated
- [x] Trends — locality/type dropdowns, months slider, dual-axis Recharts LineChart
- [x] Listings — sortable table, pagination, 300ms debounced locality search
- [x] Alerts — new listings section + price drops section with red % badge

## Step 6 — Nginx + Docker Compose ✅
- [x] `nginx/nginx.conf` — dev: proxies /api/ → backend:8000, / → frontend:5173 (Vite HMR)
- [x] `nginx/nginx.prod.conf` — prod: serves static files + proxies /api/ → portal-backend:8000
- [x] `docker-compose.yml` — dev: db, backend, frontend (Vite dev server), nginx
- [x] `docker-compose.prod.yml` — prod: portal-backend, portal-frontend (built), portal-nginx; connects to scraper's postgres via external network `sreality_default`
- [x] `.env.example`
- [x] `.gitignore`
- [x] `frontend/Dockerfile` — multi-stage: node build → nginx image serving /usr/share/nginx/html

## Step 7 — End-to-end verify ⏳
- [ ] `docker compose up` — all 4 services healthy
- [ ] Dashboard page loads with real data
- [ ] Trends page shows chart
- [ ] Listings page shows paginated table
- [ ] Alerts page shows new listings / price drops
- [ ] `pytest backend/tests/ -v` — all 14 tests passing
- **Blocked by**: Docker Desktop not running during scaffold session

## Step 8 — Documentation ✅
- [x] `README.md` — setup, env vars, how to add to scraper's prod compose
- [x] `docs/progress.md` — this file
