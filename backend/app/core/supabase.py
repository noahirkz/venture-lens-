from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key)


@lru_cache(maxsize=1)
def get_supabase_anon() -> Client:
    """Anon client — respects RLS, suitable for user-scoped queries."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)
