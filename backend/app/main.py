from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1.router import router as v1_router
from app.config import settings
from app.core.rate_limit import RateLimitResult
from app.core.supabase import get_supabase


class RateLimitHeadersMiddleware(BaseHTTPMiddleware):
    """Surface rate-limit info as response headers when an endpoint set it on `request.state`."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        rl: RateLimitResult | None = getattr(request.state, "rate_limit", None)
        if rl is not None:
            response.headers["X-RateLimit-Limit"] = str(rl.limit)
            response.headers["X-RateLimit-Remaining"] = str(max(rl.limit - rl.used, 0))
            response.headers["X-RateLimit-Reset"] = rl.reset_at.isoformat()
            response.headers["X-RateLimit-Scope"] = rl.scope
        return response


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
        "X-RateLimit-Scope",
    ],
)

app.add_middleware(RateLimitHeadersMiddleware)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.app_env}


@app.get("/health/ready")
async def health_ready() -> dict[str, str]:
    """Deep readiness probe — verifies Supabase is reachable (use for Railway healthchecks)."""
    if not settings.supabase_url or not settings.supabase_service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase not configured",
        )
    try:
        get_supabase().table("companies").select("id", count="exact").limit(0).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Supabase unreachable: {exc}",
        ) from exc
    return {"status": "ready", "env": settings.app_env}
