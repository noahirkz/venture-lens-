"""
Daily per-actor rate limiter backed by Supabase.

Strategy:
  • Identify the actor:
      - signed-in  → AuthedUser.user_id (scope="user")
      - anonymous  → SHA-256(client IP)  (scope="anon")
  • COUNT(*) of today's rows in `rate_limit_events` for that actor.
  • If count >= cap → 429.
  • Otherwise insert a new row, then let the request through.

The window resets at 00:00 UTC. We surface a Retry-After (seconds) and an
ISO reset timestamp so clients can render "resets in 4h 12m".
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, status

from app.config import settings
from app.core.auth import AuthedUser, get_current_user
from app.core.supabase import get_supabase

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RateLimitResult:
    actor_id: str
    scope: str  # "user" | "anon"
    limit: int
    used: int  # AFTER this request is counted
    reset_at: datetime  # next UTC midnight


# ── helpers ─────────────────────────────────────────────────────────────────


def _client_ip(request: Request) -> str:
    """Best-effort client IP, trusting the first XFF hop (set by Vercel/Railway)."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()
    return request.client.host if request.client else "0.0.0.0"


def _hash_ip(ip: str) -> str:
    return "ip_" + hashlib.sha256(ip.encode("utf-8")).hexdigest()[:32]


def _next_utc_midnight(now: datetime | None = None) -> datetime:
    now = now or datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).date()
    return datetime(tomorrow.year, tomorrow.month, tomorrow.day, tzinfo=timezone.utc)


def _endpoint_label(request: Request) -> str:
    route = request.scope.get("route")
    path = getattr(route, "path", request.url.path) if route else request.url.path
    return f"{request.method} {path}"


# ── core ────────────────────────────────────────────────────────────────────


def _count_today(actor_id: str) -> int:
    """Today's UTC count for this actor. Falls back to 0 on Supabase errors."""
    try:
        sb = get_supabase()
        # Prefer the RPC if it exists; otherwise fall back to a SELECT count.
        try:
            res = sb.rpc("rate_limit_count_today", {"p_actor_id": actor_id}).execute()
            if res.data is not None:
                return int(res.data) if not isinstance(res.data, list) else int(res.data[0])
        except Exception:  # noqa: BLE001 — RPC may not exist yet
            pass

        today = datetime.now(timezone.utc).date().isoformat()
        res = (
            sb.table("rate_limit_events")
            .select("id", count="exact")
            .eq("actor_id", actor_id)
            .gte("occurred_at", f"{today}T00:00:00Z")
            .execute()
        )
        return int(res.count or 0)
    except Exception as exc:  # noqa: BLE001
        logger.warning("rate_limit count failed for %s: %s — failing open", actor_id, exc)
        return 0


def _record(actor_id: str, scope: str, endpoint: str) -> None:
    try:
        get_supabase().table("rate_limit_events").insert(
            {"actor_id": actor_id, "scope": scope, "endpoint": endpoint}
        ).execute()
    except Exception as exc:  # noqa: BLE001
        # We've already authorised the call — don't fail the user request because
        # the audit insert hiccupped. Log and move on.
        logger.warning("rate_limit insert failed for %s: %s", actor_id, exc)


async def enforce_rate_limit(
    request: Request,
    user: AuthedUser | None = Depends(get_current_user),
) -> RateLimitResult:
    """
    FastAPI dependency. Raises 429 if the caller is over their daily cap.
    Otherwise records the call and returns a RateLimitResult for the route to
    stash on `request.state` so the response middleware can emit headers.
    """
    if user is not None:
        actor_id = f"user_{user.user_id}"
        scope = "user"
        limit = settings.rate_limit_user_per_day
    else:
        actor_id = _hash_ip(_client_ip(request))
        scope = "anon"
        limit = settings.rate_limit_anon_per_day

    used_before = _count_today(actor_id)
    reset_at = _next_utc_midnight()

    if used_before >= limit:
        retry_seconds = max(int((reset_at - datetime.now(timezone.utc)).total_seconds()), 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limited",
                "scope": scope,
                "limit": limit,
                "used": used_before,
                "reset_at": reset_at.isoformat(),
                "message": (
                    f"Daily limit of {limit} reached for "
                    f"{'signed-in users' if scope == 'user' else 'anonymous visitors'}. "
                    f"{'Sign up for more searches.' if scope == 'anon' else ''}"
                ).strip(),
            },
            headers={
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": reset_at.isoformat(),
                "X-RateLimit-Scope": scope,
                "Retry-After": str(retry_seconds),
            },
        )

    _record(actor_id, scope, _endpoint_label(request))
    return RateLimitResult(
        actor_id=actor_id,
        scope=scope,
        limit=limit,
        used=used_before + 1,
        reset_at=reset_at,
    )
