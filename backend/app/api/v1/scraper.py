from fastapi import APIRouter
from pydantic import BaseModel

from app.workers.pipeline import run_pipeline

router = APIRouter()


class PipelineRequest(BaseModel):
    sources: list[str] | None = None  # e.g. ["producthunt", "yc"]


@router.post("/run")
async def trigger_pipeline(req: PipelineRequest = PipelineRequest()) -> dict:
    """Manually trigger the ingestion pipeline. Runs synchronously and returns counts."""
    return await run_pipeline(sources=req.sources)
