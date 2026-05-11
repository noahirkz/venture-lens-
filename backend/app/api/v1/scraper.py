from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from app.config import settings
from app.workers.pipeline import run_pipeline

router = APIRouter()


class PipelineRequest(BaseModel):
    sources: list[str] | None = None  # e.g. ["producthunt", "yc"]


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    """Gate ingestion endpoints behind an admin token.

    In dev, leave ADMIN_TOKEN unset and pass any value (or none) to disable.
    In prod, set ADMIN_TOKEN; requests without a matching X-Admin-Token header
    are rejected with 401.
    """
    expected = settings.admin_token
    if not expected:
        # Misconfigured — refuse rather than running publicly.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin endpoint disabled — set ADMIN_TOKEN env var to enable.",
        )
    if not x_admin_token or x_admin_token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Admin-Token header.",
        )


@router.post("/run", dependencies=[Depends(require_admin)])
async def trigger_pipeline(req: PipelineRequest = PipelineRequest()) -> dict:
    """Manually trigger the ingestion pipeline. Runs synchronously and returns counts."""
    return await run_pipeline(sources=req.sources)
