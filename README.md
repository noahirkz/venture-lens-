# VentureLens

AI startup intelligence platform — monorepo.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.12 · FastAPI · Supabase · Anthropic SDK |
| Frontend | Next.js 15 · TypeScript · Tailwind CSS v4 · Supabase JS |
| Database | Supabase (PostgreSQL + Auth + Storage) |

## Structure

```
venturelens/
├── backend/          # FastAPI service
│   ├── app/
│   │   ├── api/v1/   # Route handlers
│   │   ├── core/     # Supabase & Anthropic clients
│   │   ├── models/   # Pydantic schemas
│   │   └── main.py
│   ├── tests/
│   └── pyproject.toml
└── frontend/         # Next.js app
    ├── src/
    │   ├── app/      # App Router pages & layouts
    │   ├── components/
    │   ├── lib/      # Supabase client, utilities
    │   └── types/
    └── package.json
```

## Getting started

### Backend

```bash
cd backend
cp .env.example .env          # fill in secrets
python -m venv .venv
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

### Running tests (backend)

```bash
cd backend
pytest
```

## Environment variables

See `backend/.env.example` and `frontend/.env.local.example` for all required variables.
