# VentureLens

AI search engine that helps founders and investors find the next billion-dollar bet.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.12 · FastAPI · Supabase · Anthropic SDK |
| Frontend | Next.js 15 · TypeScript · Tailwind CSS v4 · Supabase JS |
| Database | Supabase (PostgreSQL + Auth) |
| Deploy | Railway (backend) · Vercel (frontend) |

## Structure

```
venturelens/
├── backend/              # FastAPI service (Railway root directory)
│   ├── app/
│   │   ├── api/v1/       # Route handlers
│   │   ├── core/         # Auth, Supabase, rate limiting
│   │   ├── intelligence/ # Claude summarizer + scorer
│   │   ├── scrapers/     # YC, Product Hunt (Playwright)
│   │   ├── workers/      # Ingestion pipeline
│   │   └── main.py
│   ├── Dockerfile        # Production image (Chromium + Playwright)
│   ├── tests/
│   └── pyproject.toml
├── frontend/             # Next.js app (Vercel)
│   └── src/
│       ├── app/          # App Router pages
│       ├── components/
│       └── lib/          # api.ts (client) + api-server.ts (server)
└── supabase/migrations/  # SQL schema (apply in order)
```

## Getting started (local)

### Prerequisites

- Python **3.12+**
- Node.js **20+**
- Supabase project with migrations applied (see [RELAUNCH.md](RELAUNCH.md))

### Backend

```bash
cd backend
cp .env.example .env          # fill in secrets
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload  # http://localhost:8000
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # fill in secrets
npm install
npm run dev                         # http://localhost:3000
```

### Tests

```bash
cd backend
source .venv/bin/activate
pytest

cd ../frontend
npm run type-check && npm run lint
```

## Environment variables

| Backend (`backend/.env`) | Required | Notes |
|--------------------------|----------|-------|
| `SUPABASE_URL` | yes | |
| `SUPABASE_SERVICE_KEY` | yes | Rate limit writes |
| `SUPABASE_JWT_SECRET` | yes | Verify user JWTs |
| `ANTHROPIC_API_KEY` | yes | Analyze + pipeline |
| `ADMIN_TOKEN` | prod | Gates `/api/v1/scraper/run` |
| `CORS_ORIGINS` | prod | Comma-separated, no trailing slash |

| Frontend (Vercel / `.env.local`) | Required |
|----------------------------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes |
| `NEXT_PUBLIC_API_URL` | yes | Railway backend URL |

See `backend/.env.example` and `frontend/.env.local.example` for the full list.

## Production deploy

**Full step-by-step checklist:** [RELAUNCH.md](RELAUNCH.md)

Summary:

1. Apply Supabase migrations `001` → `004`.
2. Deploy backend to Railway (root directory: `backend`, Dockerfile builder).
3. Set Railway env vars; smoke `/health/ready` and `/api/v1/me`.
4. Deploy frontend to Vercel; set `NEXT_PUBLIC_*` vars.
5. Update Railway `CORS_ORIGINS` with your Vercel domain.
6. Run end-to-end smoke (analyze, rate limits, auth).

## API endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | — | Liveness |
| GET | `/health/ready` | — | Supabase connectivity |
| GET | `/api/v1/me` | optional | Quota + auth status |
| GET | `/api/v1/companies` | optional | Rate-limited |
| POST | `/api/v1/companies/analyze` | optional | Rate-limited |
| POST | `/api/v1/scraper/run` | `X-Admin-Token` | Ingestion pipeline |
