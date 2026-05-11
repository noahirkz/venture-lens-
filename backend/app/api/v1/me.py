"""Return the caller's auth status + remaining daily quota — used by the frontend nav."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request

from app.config import settings
from app.core.auth import AuthedUser, get_current_user
from app.core.rate_limit import _client_ip, _count_today, _next_utc_midnight

router = APIRouter()


@router.get("")
async def me(
    request: Request,
    user: AuthedUser | None = Depends(get_current_user),
) -> dict:
    if user is not None:
        actor_id = f"user_{user.user_id}"
        limit = settings.rate_limit_user_per_day
        scope = "user"
    else:
        ip = _client_ip(request)
        actor_id = "ip_" + hashlib.sha256(ip.encode("utf-8")).hexdigest()[:32]
        limit = settings.rate_limit_anon_per_day
        scope = "anon"

    used = _count_today(actor_id)
    return {
        "authenticated": user is not None,
        "user": {"id": user.user_id, "email": user.email} if user else None,
        "rate_limit": {
            "scope": scope,
            "limit": limit,
            "used": used,
            "remaining": max(limit - used, 0),
            "reset_at": _next_utc_midnight().isoformat(),
            "now": datetime.now(timezone.utc).isoformat(),
        },
    }
