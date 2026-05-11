"""Lazy Anthropic client factories — see app.core.supabase for the rationale."""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

from app.config import settings

if TYPE_CHECKING:
    import anthropic  # noqa: F401


@lru_cache(maxsize=1)
def get_anthropic():
    import anthropic

    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


@lru_cache(maxsize=1)
def get_async_anthropic():
    import anthropic

    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
