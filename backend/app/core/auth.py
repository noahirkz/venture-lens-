"""
Supabase JWT verification.

Supabase Auth signs access tokens with HS256 using the project's JWT secret
(found in Project Settings → API → "JWT Secret"). We verify the signature
locally — no network round-trip per request.

If `SUPABASE_JWT_SECRET` is not configured, every request is treated as anon.
"""

from __future__ import annotations

from dataclasses import dataclass

import jwt
from fastapi import Header

from app.config import settings


@dataclass(frozen=True)
class AuthedUser:
    user_id: str
    email: str | None = None


def _strip_bearer(value: str | None) -> str | None:
    if not value:
        return None
    parts = value.strip().split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return value.strip() or None


def verify_supabase_jwt(token: str) -> AuthedUser | None:
    """Verify a Supabase access token. Returns None on any failure."""
    secret = settings.supabase_jwt_secret
    if not secret or not token:
        return None
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError:
        return None

    sub = payload.get("sub")
    if not sub:
        return None
    return AuthedUser(user_id=str(sub), email=payload.get("email"))


async def get_current_user(
    authorization: str | None = Header(default=None),
) -> AuthedUser | None:
    """FastAPI dependency: returns AuthedUser if a valid Supabase JWT was sent, else None."""
    token = _strip_bearer(authorization)
    if not token:
        return None
    return verify_supabase_jwt(token)
