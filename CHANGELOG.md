# VentureLens — v0.2 changes

This pass covered the audit, bug fixes, daily rate limiting, basic auth UI, and
deployment prep.

## v0.2.3 cross-surface audit (Supabase + GitHub + Vercel)

Live-checked the three deployment surfaces and applied two more migrations
based on Supabase's advisor lints.

**Supabase** — project `wtwwojhqanditcciiycw`, region `us-west-1`, status
`ACTIVE_HEALTHY`. Migrations `001_schema`, `002_rate_limits`, plus new
`003_security_hardening` and `004_revoke_rls_auto_enable_public` all applied.
Tables: `companies`, `founders`, `funding_events`, `rate_limit_events` — all
with RLS enabled. Security advisor was down to 4 lints; now down to 2,
both intentional/dashboard-only (RLS-no-policy on `rate_limit_events` is
the design, leaked-password protection is an Auth dashboard toggle).
Performance advisor has unused-index INFO notes that are expected on a
zero-row database.

**003_security_hardening.sql** — pinned `rate_limit_count_today` to
`search_path = ''` and fully-qualified `public.rate_limit_events` to block
schema-injection; revoked EXECUTE on the Supabase-internal `rls_auto_enable`
event trigger from `anon` and `authenticated`; added a `COMMENT ON TABLE`
explaining the (intentional) zero-policy state on `rate_limit_events`.

**004_revoke_rls_auto_enable_public.sql** — `rls_auto_enable`'s PUBLIC
EXECUTE grant (`=X/postgres`) was still present after revoking from
named roles, so revoked from PUBLIC too. Advisor confirmed clean.

**Vercel** — the prior `venturelens` project (`prj_abDzhpPdrj8icY5O7EU8sTkBIcmv`)
no longer exists; you cleaned up the experimental ones. Cleared
`frontend/.vercel/project.json` so `vercel link` / `vercel --prod` will
re-prompt cleanly instead of failing with "project not found". You'll re-link
to a new project as part of the deploy.

**GitHub** — `noahirkz/venture-lens-`, branch `main`, last pushed commit
`3257f86` ("feat: add auth, rate limiting, and /me endpoint"). 9 uncommitted
local files (v0.2.1, v0.2.2, v0.2.3 work). Push captures everything.

## v0.2.2 self-audit hotfixes

- **Dockerfile install-order bug.** `pip install -e .` ran before `COPY app
  ./app`, but `pyproject.toml` declares `packages = ["app"]` — hatchling would
  fail at install time with "package not found." Fixed by stubbing
  `app/__init__.py` before install so the editable install resolves; the real
  `app/` is then copied over the stub (editable .pth picks it up).
- **`/companies/[id]` double-fetch.** Both `generateMetadata()` and the page
  body called `serverApi.companies.get(id)`, so one page view consumed 2 of
  the day's 3 anon slots. Wrapped `serverApi.companies.{get,list}` in React's
  `cache()` — per-request dedup, one fetch per page render.

## v0.2.1 hotfixes (Railway + Vercel build failures)

- **`backend/Dockerfile`**. The original `nixpacks.toml` failed on Railway
  with `pip: command not found` because pip wasn't on PATH in that nix env,
  and we couldn't easily install Chromium's runtime libs. Switched to a pinned
  `python:3.12-slim` image with the Chromium apt deps and a build-time
  `playwright install chromium`. `railway.toml` now points
  `builder = "DOCKERFILE"`. The old `nixpacks.toml` is intentionally empty
  (sandbox can't `rm` files; safe to delete on your machine).
- **`backend/.dockerignore`**. Skips `.venv`, caches, tests, and `.env`.
- **Suspense boundary on `/login` and `/signup`.** Next 15 hard-fails
  `next build` if `useSearchParams()` runs outside `<Suspense>`. Wrapped
  `<AuthForm>` in both pages.
- **`frontend/src/lib/api.ts` split into `api.ts` (client) + `api-server.ts`
  (server).** The original combined file imported `next/headers` (even via
  dynamic `import()`) and was reachable from a Client Component, which
  Next.js's bundler refuses with "Ecmascript file had an error … needs
  next/headers". The split forces physical separation.

## What changed

### Backend

- **Auth.** `app/core/auth.py` verifies Supabase JWTs (HS256) using
  `SUPABASE_JWT_SECRET`. A FastAPI dependency returns `AuthedUser | None`.
- **Daily rate limiter.** `app/core/rate_limit.py` writes one row per gated call
  to a new `rate_limit_events` table; counts today's UTC rows; returns 429 with
  `Retry-After` and a structured detail body when exceeded. Anon: SHA-256 of
  client IP (X-Forwarded-For aware). Signed: `user_<sub>`.
- **Wired into all `/api/v1/companies/*` endpoints** (`GET`, `GET /{id}`,
  `POST /analyze`).
- **Response headers.** New middleware emits
  `X-RateLimit-{Limit,Remaining,Reset,Scope}` on every gated response.
- **`/api/v1/me`.** New endpoint that returns auth status + remaining quota for
  the caller.
- **`/api/v1/scraper/run` is now gated** behind a required `X-Admin-Token`
  header (refuses with 503 if `ADMIN_TOKEN` is unset — fail-closed).
- **Bug: `GET /companies/{id}` 404.** `.maybe_single()` no longer leaks 406s;
  unknown IDs return a clean 404.
- **Bug: `POST /companies/analyze` returns canonical row.** Re-fetch fallback
  guarantees the response always carries an `id` so the frontend's
  "Full Profile" link works.
- **Bug: 422 on empty input** (instead of calling Claude with an empty body).
- **Config hardened.** `Settings` no longer crashes at import without env vars
  (so tests run cleanly). New env vars: `SUPABASE_JWT_SECRET`, `ADMIN_TOKEN`,
  `RATE_LIMIT_ANON_PER_DAY` (default 3), `RATE_LIMIT_USER_PER_DAY` (default 7).
- **Lazy imports** for `supabase`, `anthropic`, and `playwright` so module
  imports don't require those packages.
- **CORS exposes the `X-RateLimit-*` headers.**
- **`backend/nixpacks.toml`.** Installs Chromium during the Railway build so
  the scraper actually has a browser at runtime (previously crashed).
- **New tests.** `tests/test_auth.py` (5) and `tests/test_rate_limit.py` (2).
  All 8 tests pass.

### Frontend

- **Login + signup pages** (`/login`, `/signup`) with shared `AuthForm`. Email +
  password via `@supabase/ssr`. Honors `?next=…` redirect.
- **`AuthProvider`** (`lib/auth-context.tsx`). Subscribes to Supabase
  `onAuthStateChange`. `<Nav>` shows the user's email + sign-out, or sign-in
  / sign-up CTAs.
- **Session refresh middleware** (`src/middleware.ts`) — required by
  `@supabase/ssr` to keep cookies fresh.
- **API client** (`src/lib/api.ts`) split into `api` (browser, pulls Supabase
  JWT from session) and `serverApi` (server components, forwards
  `Authorization` cookie + `x-forwarded-for` to the backend so SSR pages
  rate-limit correctly per user).
- **Analyze page** consumes the new typed `ApiError` and renders a
  rate-limited panel with reset time and a "Sign up for more" CTA when an
  anon user is over their cap.
- **`force-dynamic`** on `/`, `/companies`, `/companies/[id]` — per-user rate
  limits make caching unsafe.
- **`frontend/.env.production`** no longer ships a placeholder API URL — set
  `NEXT_PUBLIC_API_URL` in the Vercel project's env vars instead.

### Schema

- **`supabase/migrations/002_rate_limits.sql`** — new `rate_limit_events`
  table, hot index `(actor_id, occurred_on)`, RLS enabled with no public
  policies, plus an `rate_limit_count_today(actor_id)` SQL helper.

---

## What you need to do — in order

### 1. Apply the new Supabase migration

In the Supabase Dashboard → SQL editor, run the entire contents of
`supabase/migrations/002_rate_limits.sql`. Or via the Supabase CLI:

```bash
supabase db push
```

### 2. Set new backend env vars on Railway

Project → Variables → add:

```
SUPABASE_JWT_SECRET     = <Supabase Project Settings → API → JWT Secret>
ADMIN_TOKEN             = <generate any long random string>
CORS_ORIGINS            = https://venturelens-five.vercel.app,http://localhost:3000
RATE_LIMIT_ANON_PER_DAY = 3      # optional, this is the default
RATE_LIMIT_USER_PER_DAY = 7      # optional, this is the default
```

In Railway → Service Settings, set **Root Directory** to `backend` (Railway's
diagnostic agent already did this for the `venture-lens-` service — confirm
it's still set).

Trigger a redeploy. Railway will use `backend/Dockerfile` (driven by
`railway.toml`'s `builder = "DOCKERFILE"`) which installs Chromium during
the build so the scraper actually has a browser to drive.

### 3. Deploy the frontend to Vercel

The project is already linked at `frontend/.vercel/project.json` →
`prj_abDzhpPdrj8icY5O7EU8sTkBIcmv` (`venturelens-five.vercel.app`).

First, make sure the Vercel project has these env vars (Project → Settings →
Environment Variables → Production):

```
NEXT_PUBLIC_SUPABASE_URL      = https://wtwwojhqanditcciiycw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_7SJYVHf7wtaXqA6rqJpxPg_Bf-n5K8C
NEXT_PUBLIC_API_URL           = https://<your-railway-domain>.railway.app
```

Then deploy from your terminal:

```bash
cd ~/venturelens/frontend
npx vercel --prod
```

(One-time only: `npx vercel login` if the CLI isn't authenticated yet.)

### 4. Push to GitHub (optional but recommended)

The remote is already `https://github.com/noahirkz/venture-lens-.git`.

```bash
cd ~/venturelens
git add .
git commit -m "feat: rate limiting + auth + bug fixes"
git push origin main
```

---

## Sanity checklist after deploy

- `GET https://<railway>/health` → `{"status":"ok"}`
- `GET https://<railway>/api/v1/me` (no auth) → `{"authenticated":false, "rate_limit":{"limit":3, …}}`
- Visit `https://venturelens-five.vercel.app`, hit Analyze 3 times → 4th
  shows the "Daily limit reached" panel.
- Sign up, then Analyze → counter resets to 7/day for that user.
- 4th call as that user → rate-limited again, this time scoped to `user`.

If `/health` 404s, the backend hasn't redeployed yet.
If you see CORS errors in the browser console, double-check `CORS_ORIGINS`
on Railway includes your Vercel domain exactly (no trailing slash).

---

## Final 4-step deploy (post v0.2.2)

Everything is locally tested: tsc clean, eslint clean, pytest 8/8 green, ASGI
smoke confirms 429 + headers + admin gate. Do these four in order.

### 1. Push to GitHub (triggers Railway auto-deploy)

```bash
cd ~/venturelens
git add .
git commit -m "fix: Dockerfile install order + dedup SSR fetches"
git push origin main
```

Railway is wired to `noahirkz/venture-lens-` and will rebuild from the
`backend/` root using the Dockerfile. Watch Build Logs — you want
"Successfully built …" followed by a green Deploy log.

### 2. Confirm Supabase migration 002 is applied

In Supabase SQL Editor, run a one-liner:

```sql
select count(*) from rate_limit_events;
```

If it returns `0` you're good. If it errors with "relation does not exist,"
run `supabase/migrations/002_rate_limits.sql` first.

### 3. Confirm Railway env vars are set

Variables tab on the `venture-lens-` service must include all of:

```
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY,
SUPABASE_JWT_SECRET, ANTHROPIC_API_KEY, ADMIN_TOKEN,
CORS_ORIGINS=https://venturelens-five.vercel.app,http://localhost:3000
```

After Railway is green, hit two URLs in a browser:

- `https://<your-railway>/health` → `{"status":"ok","env":"production"}`
- `https://<your-railway>/api/v1/me` → `{"authenticated":false, "rate_limit":{"limit":3,…}}`

### 4. Redeploy frontend

```bash
cd ~/venturelens/frontend
npx vercel --prod
```

In the Vercel project settings, confirm `NEXT_PUBLIC_API_URL` points at your
Railway URL. Open `venturelens-five.vercel.app`, hit `/analyze` four times
as a guest — the 4th should show the rate-limit banner. Sign up, repeat —
new cap of 7.

### Stop-conditions per step

| Step | If this happens | Do |
|------|------------------|----|
| 1    | Railway build red | Check Build Logs for the specific apt or pip line that failed; it should NOT be `pip: command not found` anymore |
| 2    | Migration error | Re-run 002_rate_limits.sql by hand in SQL Editor |
| 3    | `/me` returns 500 | One of SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_JWT_SECRET is wrong |
| 4    | CORS error in console | `CORS_ORIGINS` on Railway is missing your Vercel domain or has a trailing slash |

If all four steps come back clean, the project is operational.
