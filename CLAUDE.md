# DBRealtor Web Portal — CLAUDE.md

## Purpose

Read-only analytics portal over the PostgreSQL database populated by the
[DBRealtor scraper](../DBRealtor). The portal exposes a FastAPI REST API and
a React/TypeScript frontend. It does **not** scrape anything.

## Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| Backend     | FastAPI (Python 3.12+), SQLAlchemy async, asyncpg |
| Frontend    | React 18 + TypeScript + Vite                    |
| Styling     | Tailwind CSS v3                                 |
| Charts      | Recharts                                        |
| HTTP client | TanStack Query (react-query)                    |
| Reverse proxy | Nginx                                          |
| Containers  | Docker + docker-compose                         |

## Database schema reference

Full schema is documented in `C:\Git\DBRealtor\docs\architecture.md`.

Tables (all **read-only** from this project):
- `listings` — active/delisted real estate listings
- `price_history` — price snapshots per listing
- `scrape_runs` — metadata about each scraper execution

## Hard rules

### Backend
- **READ-ONLY**: no `INSERT`, `UPDATE`, or `DELETE` endpoints — ever.
- All DB access via **SQLAlchemy async** (`AsyncSession` + `async with`).
- **No raw SQL strings** — use the ORM or `sqlalchemy.text()` only for
  analytical aggregations that cannot be expressed cleanly with the ORM.
- Never call `session.commit()`, `session.add()`, or `session.delete()`.
- Return Pydantic v2 response models from all endpoints.
- All endpoints under `/api/` prefix.

### Frontend
- **TypeScript strict mode** (`"strict": true` in tsconfig.json).
- **No `any` types** — use proper types or `unknown` with narrowing.
- All API calls via TanStack Query hooks in `src/api/`.
- Pages import only from `src/components/` and `src/api/`.

## How to run (development)

```bash
# Copy env file and fill in DB credentials
cp .env.example .env

# Start all services
docker compose up

# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

## How to run tests

```bash
# Backend tests (requires DB running)
docker compose up -d postgres
cd backend
pytest tests/ -v
```

## Project layout

```
dbrealtor-web/
├── CLAUDE.md               ← you are here
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── src/
│   │   ├── main.py         ← FastAPI app + CORS + routers
│   │   ├── database.py     ← async engine + get_session() dep
│   │   ├── models.py       ← read-only ORM mirrors of scraper schema
│   │   └── routers/
│   │       ├── dashboard.py
│   │       ├── trends.py
│   │       ├── listings.py
│   │       └── alerts.py
│   └── tests/
└── frontend/
    └── src/
        ├── api/            ← TanStack Query hooks
        ├── components/
        └── pages/
```
