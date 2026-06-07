# VentureLens — operational relaunch checklist

Single runbook to bring VentureLens live on **Supabase + Railway + Vercel**.
Do these steps in order. Stop at any **Stop if** row and fix before continuing.

## Architecture

```
Browser → Vercel (Next.js) → Railway (FastAPI) → Supabase (Postgres + Auth)
                                      ↓
                                 Anthropic API
```

---

## Phase 0 — Local preflight (before touching production)

Run from the repo root:

```bash
# Backend (Python 3.12 required)
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest                    # expect 9 passing

# Frontend
cd ../frontend
npm ci
npm run type-check && npm run lint && npm run build
```

| If this fails | Fix |
|---------------|-----|
| `requires-python >=3.12` | Install Python 3.12 (`pyenv`, `brew`, or `uv`) |
| Next build Suspense error | Ensure `login/page.tsx` and `signup/page.tsx` wrap `AuthForm` in `<Suspense>` |
| `next/headers` bundler error | Never import `api-server.ts` from Client Components |

---

## Phase 1 — Supabase

**Goal:** Schema, rate limits, and security migrations applied.

### 1. Apply migrations (in order)

In Supabase Dashboard → **SQL Editor**, run each file entirely:

| # | File |
|---|------|
| 1 | `supabase/migrations/001_schema.sql` |
| 2 | `supabase/migrations/002_rate_limits.sql` |
| 3 | `supabase/migrations/003_security_hardening.sql` |
| 4 | `supabase/migrations/004_revoke_rls_auto_enable_public.sql` |

Or via CLI: `supabase db push` from a linked project.

### 2. Verify

```sql
select count(*) from companies;
select count(*) from rate_limit_events;
select rate_limit_count_today('test_actor');
```

All three must succeed (counts may be `0`).

### 3. Collect secrets (Project Settings → API)

| Secret | Used by |
|--------|---------|
| Project URL | Backend + Frontend |
| `anon` / publishable key | Frontend + Backend |
| `service_role` key | Backend only (rate limit writes) |
| JWT Secret (HS256) | Backend auth verification |

### 4. Optional dashboard hardening

- **Auth** → enable leaked password protection.
- Confirm email auth is enabled for signup.

| Stop if | Fix |
|---------|-----|
| `rate_limit_count_today` errors | Re-run `002_rate_limits.sql` |
| `relation does not exist` | Run `001_schema.sql` first |

---

## Phase 2 — Railway backend

**Goal:** Public API at `https://<your-app>.up.railway.app`.

### 1. Create service

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub `noahirkz/venture-lens-`.
2. **Settings → Root Directory:** `backend` (required).
3. **Builder:** Dockerfile (`backend/railway.toml` sets `builder = "DOCKERFILE"`).
4. **Health check:** `/health/ready` (verifies Supabase connectivity).

### 2. Environment variables

Set in Railway → Variables → Production:

```
APP_ENV=production
DEBUG=false
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-role-key>
SUPABASE_JWT_SECRET=<jwt-secret>
ANTHROPIC_API_KEY=sk-ant-...
ADMIN_TOKEN=<long-random-string>
CORS_ORIGINS=https://<your-vercel-domain>.vercel.app,http://localhost:3000
RATE_LIMIT_ANON_PER_DAY=3
RATE_LIMIT_USER_PER_DAY=7
```

`RESEND_API_KEY` is optional (unused in code).

**CORS:** Origin must match your Vercel URL exactly — no trailing slash.

### 3. Deploy and smoke-test

Replace `<railway-domain>` with your Railway public URL:

```bash
curl -s https://<railway-domain>/health
# → {"status":"ok","env":"production"}

curl -s https://<railway-domain>/health/ready
# → {"status":"ready","env":"production"}

curl -s https://<railway-domain>/api/v1/me
# → {"authenticated":false,"rate_limit":{"limit":3,...}}

curl -s https://<railway-domain>/api/v1/companies
# → [] or array of companies
```

Optional seed (requires `ADMIN_TOKEN`, costs Anthropic credits):

```bash
curl -s -X POST https://<railway-domain>/api/v1/scraper/run \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: <ADMIN_TOKEN>" \
  -d '{"sources":["yc"]}'
```

| Stop if | Fix |
|---------|-----|
| Build: `pip: command not found` | Confirm Dockerfile builder, not nixpacks |
| `/health/ready` 503 | Wrong `SUPABASE_URL` or `SUPABASE_SERVICE_KEY` |
| `/me` 500 | Service key or JWT secret missing/wrong |
| Playwright crash at runtime | Check Railway build logs for Chromium install |

---

## Phase 3 — Vercel frontend

**Goal:** Next.js app points at Railway with Supabase auth cookies.

### 1. Link project

```bash
cd frontend
npx vercel login          # one-time
npx vercel link           # create or link project
```

### 2. Production environment variables

Vercel → Project → Settings → Environment Variables → **Production**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_URL=https://<railway-domain>
```

Do **not** commit `frontend/.env.production` — set vars only in Vercel.

### 3. Deploy

```bash
cd frontend
npx vercel --prod
```

### 4. Update Railway CORS

Once you know the final Vercel URL, update `CORS_ORIGINS` on Railway and redeploy if you used a placeholder.

| Stop if | Fix |
|---------|-----|
| CORS error in browser console | Add exact Vercel origin to Railway `CORS_ORIGINS` |
| API calls to localhost | `NEXT_PUBLIC_API_URL` not set in Vercel Production |

---

## Phase 4 — End-to-end smoke (production)

| # | Flow | Pass |
|---|------|------|
| 1 | Open `/` | Dashboard loads |
| 2 | Guest `/analyze` × 3 | Three successful analyses |
| 3 | Guest 4th analyze | "Daily limit reached" panel |
| 4 | `/signup` → `/analyze` | 7/day cap for signed-in user |
| 5 | `/companies` + search filter | Client-side filter works |
| 6 | `/companies/[id]` | Profile loads (1 rate-limit slot per page view) |
| 7 | Optional | Admin scraper seed → companies on dashboard |

---

## Success criteria

VentureLens is **fully operational** when:

1. Migrations 001–004 applied and `rate_limit_count_today` works.
2. Railway `/health`, `/health/ready`, and `/api/v1/me` return 200.
3. Vercel production site loads with no CORS errors.
4. Guest and authed analyze flows respect daily rate limits.
5. `NEXT_PUBLIC_API_URL` points at Railway in Vercel Production env.

---

## Quick reference — local dev

```bash
# Terminal 1 — backend
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend && npm run dev
```

Copy `backend/.env.example` → `backend/.env` and `frontend/.env.local.example` → `frontend/.env.local`.
