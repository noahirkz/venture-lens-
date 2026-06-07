-- ─────────────────────────────────────────────────────────────────────────────
-- VentureLens — security hardening based on Supabase advisor findings
-- ─────────────────────────────────────────────────────────────────────────────

-- Fix WARN: function_search_path_mutable on rate_limit_count_today
-- Setting search_path = '' (empty) blocks schema-injection attacks; we
-- fully-qualify the table reference so the function still resolves.
create or replace function public.rate_limit_count_today(p_actor_id text)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
    from public.rate_limit_events
   where actor_id = p_actor_id
     and occurred_on = (now() at time zone 'utc')::date;
$$;

-- Fix WARN: anon/authenticated can execute SECURITY DEFINER rls_auto_enable
-- This is a Supabase-internal event-trigger helper — there is no legitimate
-- reason for either role to call it via PostgREST RPC.
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

-- Document the (intentional) zero-policy state on rate_limit_events: only
-- the service-role key (which bypasses RLS) writes here.
comment on table public.rate_limit_events is
  'Per-actor daily counters for the API rate limiter. RLS-enabled with NO policies on purpose — only the service-role key writes/reads. Anon/authenticated callers see nothing.';
