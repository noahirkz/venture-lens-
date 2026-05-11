from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.rate_limit import RateLimitResult, enforce_rate_limit
from app.core.supabase import get_supabase
from app.intelligence.scorer import score_company
from app.intelligence.summarizer import summarize_company

router = APIRouter()


class AnalyzeRequest(BaseModel):
    name: str
    description: str
    website: str = ""


def _attach_rate_state(request: Request, rl: RateLimitResult) -> None:
    """Stash rate-limit info on the request for the response middleware."""
    request.state.rate_limit = rl


@router.get("")
async def list_companies(
    request: Request,
    rl: RateLimitResult = Depends(enforce_rate_limit),
) -> list[dict]:
    _attach_rate_state(request, rl)
    result = (
        get_supabase()
        .table("companies")
        .select("*")
        .order("score", desc=True)
        .limit(50)
        .execute()
    )
    return result.data or []


@router.get("/{company_id}")
async def get_company(
    company_id: str,
    request: Request,
    rl: RateLimitResult = Depends(enforce_rate_limit),
) -> dict:
    _attach_rate_state(request, rl)
    try:
        result = (
            get_supabase()
            .table("companies")
            .select("*, founders(*), funding_events(*)")
            .eq("id", company_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        # supabase-py can raise on 406/no-rows in some versions
        raise HTTPException(status_code=404, detail="Company not found") from exc

    if not result or not result.data:
        raise HTTPException(status_code=404, detail="Company not found")
    return result.data


@router.post("/analyze")
async def analyze_company(
    req: AnalyzeRequest,
    request: Request,
    rl: RateLimitResult = Depends(enforce_rate_limit),
) -> dict:
    _attach_rate_state(request, rl)

    name = (req.name or "").strip()
    description = (req.description or "").strip()
    if not name or not description:
        raise HTTPException(status_code=422, detail="name and description are required")

    summary = await summarize_company(
        name=name,
        description=description,
        website=req.website,
    )
    score_result = await score_company(
        summary=summary,
        raw_description=description,
    )

    record: dict = {
        "name": summary.get("name") or name,
        "website": req.website or None,
        "description": description,
        "summary": summary.get("one_line_description"),
        "score": score_result.get("score"),
        "score_reason": score_result,
        "source": "manual",
        "raw_data": {"summary": summary},
    }

    sb = get_supabase()
    upsert = (
        sb.table("companies")
        .upsert(record, on_conflict="name,source")
        .execute()
    )
    if upsert.data:
        return upsert.data[0]

    # Fallback re-fetch so the frontend always gets an id back.
    refetch = (
        sb.table("companies")
        .select("*")
        .eq("name", record["name"])
        .eq("source", "manual")
        .limit(1)
        .execute()
    )
    if refetch.data:
        return refetch.data[0]

    raise HTTPException(status_code=500, detail="Failed to persist analysis")
