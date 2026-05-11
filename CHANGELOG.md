# VentureLens — v0.2 changes

This pass covered the audit, bug fixes, daily rate limiting, basic auth UI, and
deployment prep.

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

Trigger a redeploy. The new `nixpacks.toml` will install Chromium during the
build so the scraper works.

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
