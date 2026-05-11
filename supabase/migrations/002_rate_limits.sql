-- ─────────────────────────────────────────────────────────────────────────────
-- VentureLens — daily per-actor rate limit log
-- ─────────────────────────────────────────────────────────────────────────────
--
-- One row per gated request. The backend counts rows per actor per UTC day.
-- An "actor" is either:
--   • a Supabase auth user.id (UUID stored as text), or
--   • the SHA-256 hash of the client IP for anonymous traffic.
--
-- This table is written via the service-role key only — RLS blocks all anon access.
--
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists rate_limit_events (
  id          uuid        primary key default gen_random_uuid(),
  actor_id    text        not null,                                 -- user.id OR ip-hash
  scope       text        not null check (scope in ('user','anon')),
  endpoint    text        not null,                                 -- e.g. "GET /companies"
  occurred_at timestamptz not null default now(),
  occurred_on date        generated always as ((occurred_at at time zone 'utc')::date) stored
);

-- Hot path: COUNT(*) WHERE actor_id = ? AND occurred_on = current_date
create index if not exists idx_rate_limit_actor_day
  on rate_limit_events (actor_id, occurred_on);

-- Housekeeping: lets us prune rows older than N days easily.
create index if not exists idx_rate_limit_occurred_on
  on rate_limit_events (occurred_on);

-- RLS — only the service-role key (which bypasses RLS) should touch this table.
alter table rate_limit_events enable row level security;
-- No policies are created on purpose. anon/authenticated keys see nothing.

-- Helpful RPC: returns today's UTC count for an actor without round-tripping rows.
create or replace function rate_limit_count_today(p_actor_id text)
returns integer
language sql
stable
as $$
  select count(*)::integer
    from rate_limit_events
   where actor_id = p_actor_id
     and occurred_on = (now() at time zone 'utc')::date;
$$;
