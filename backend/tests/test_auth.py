"""Smoke tests for app.core.auth."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings
from app.core.auth import _strip_bearer, verify_supabase_jwt


def test_strip_bearer() -> None:
    assert _strip_bearer(None) is None
    assert _strip_bearer("") is None
    assert _strip_bearer("   ") is None
    assert _strip_bearer("Bearer abc") == "abc"
    assert _strip_bearer("bearer abc") == "abc"
    assert _strip_bearer("abc") == "abc"


def test_verify_jwt_round_trip() -> None:
    settings.supabase_jwt_secret = "test-secret-for-unit-test"
    payload = {
        "sub": "11111111-1111-1111-1111-111111111111",
        "email": "test@example.com",
        "aud": "authenticated",
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
    }
    token = jwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")
    user = verify_supabase_jwt(token)
    assert user is not None
    assert user.user_id == payload["sub"]
    assert user.email == "test@example.com"


def test_verify_jwt_rejects_bad_signature() -> None:
    settings.supabase_jwt_secret = "real-secret"
    payload = {
        "sub": "abc",
        "aud": "authenticated",
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
    }
    token = jwt.encode(payload, "wrong-secret", algorithm="HS256")
    assert verify_supabase_jwt(token) is None


def test_verify_jwt_rejects_expired() -> None:
    settings.supabase_jwt_secret = "real-secret"
    payload = {
        "sub": "abc",
        "aud": "authenticated",
        "exp": int((datetime.now(timezone.utc) - timedelta(hours=1)).timestamp()),
    }
    token = jwt.encode(payload, "real-secret", algorithm="HS256")
    assert verify_supabase_jwt(token) is None


def test_verify_jwt_returns_none_when_secret_unset() -> None:
    settings.supabase_jwt_secret = ""
    assert verify_supabase_jwt("anything") is None
