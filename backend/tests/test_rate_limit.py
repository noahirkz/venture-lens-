"""Smoke tests for app.core.rate_limit (without hitting Supabase)."""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.rate_limit import _hash_ip, _next_utc_midnight


def test_hash_ip_stable_and_prefixed() -> None:
    a = _hash_ip("203.0.113.42")
    b = _hash_ip("203.0.113.42")
    c = _hash_ip("203.0.113.43")
    assert a == b
    assert a != c
    assert a.startswith("ip_")
    assert len(a) == 3 + 32


def test_next_utc_midnight_strictly_in_future() -> None:
    now = datetime.now(timezone.utc)
    nxt = _next_utc_midnight(now)
    assert nxt > now
    assert nxt.tzinfo is timezone.utc
    assert nxt.hour == 0 and nxt.minute == 0 and nxt.second == 0
