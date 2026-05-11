"""Lazy Supabase client factories.

The supabase package is heavy and pulls in postgrest/realtime/etc., so we
defer the import until a client is actually requested. This keeps test
imports cheap and lets `import app.main` succeed in environments where
supabase isn't installed (e.g. unit-test rigs).
"""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING, Any

from app.config import settings

if TYPE_CHECKING:
    from supabase import Client


@lru_cache(maxsize=1)
def get_supabase() -> "Client":
    from supabase import create_client  # local import — see module docstring

    return create_client(settings.supabase_url, settings.supabase_service_key)


@lru_cache(maxsize=1)
def get_supabase_anon() -> "Client":
    """Anon client — respects RLS, suitable for user-scoped queries."""
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_anon_key)


__all__: list[Any] = ["get_supabase", "get_supabase_anon"]
