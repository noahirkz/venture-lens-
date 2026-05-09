-- ─────────────────────────────────────────────────────────────────────────────
-- VentureLens — initial schema
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Companies ────────────────────────────────────────────────────────────────

create table companies (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  website        text,
  description    text,
  summary        text,                           -- AI one-liner
  score          smallint    check (score between 0 and 100),
  score_reason   jsonb,                          -- {signals:{...}, reasoning:"..."}
  stage          text,                           -- pre-seed, seed, series-a, …
  sector         text,
  hq_country     text,
  founded_year   smallint,
  employee_count integer,
  total_raised   bigint,                         -- USD
  last_round     text,
  source         text,                           -- producthunt | yc | manual | …
  source_url     text,
  raw_data       jsonb,
  crm_stage      text        not null default 'watching'
                             check (crm_stage in ('watching','contacted','meeting','passed','invested')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- dedup key: same company name from the same source is one record
  constraint companies_name_source_unique unique (name, source)
);

-- ── Founders ─────────────────────────────────────────────────────────────────

create table founders (
  id           uuid        primary key default gen_random_uuid(),
  company_id   uuid        not null references companies (id) on delete cascade,
  name         text        not null,
  linkedin_url text,
  background   text,
  prior_exits  smallint    not null default 0,
  is_repeat    boolean     not null default false,
  created_at   timestamptz not null default now()
);

-- ── Funding events ───────────────────────────────────────────────────────────

create table funding_events (
  id          uuid        primary key default gen_random_uuid(),
  company_id  uuid        not null references companies (id) on delete cascade,
  event_date  date,
  round_type  text,
  amount_usd  bigint,
  investors   text[],
  source_url  text,
  created_at  timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index idx_companies_score      on companies (score desc);
create index idx_companies_sector     on companies (sector);
create index idx_companies_crm_stage  on companies (crm_stage);
create index idx_companies_source     on companies (source);
create index idx_founders_company     on founders (company_id);
create index idx_funding_company      on funding_events (company_id);
create index idx_funding_date         on funding_events (event_date desc);

-- ── updated_at auto-stamp ────────────────────────────────────────────────────

create or replace function _set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at
  before update on companies
  for each row execute function _set_updated_at();

-- ── Row-Level Security ───────────────────────────────────────────────────────
-- Service-role key bypasses RLS automatically; anon key gets read-only access.

alter table companies      enable row level security;
alter table founders       enable row level security;
alter table funding_events enable row level security;

-- Public read (used by frontend via anon key)
create policy "public read companies"
  on companies for select using (true);

create policy "public read founders"
  on founders for select using (true);

create policy "public read funding_events"
  on funding_events for select using (true);
