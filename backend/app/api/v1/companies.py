from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.supabase import get_supabase
from app.intelligence.scorer import score_company
from app.intelligence.summarizer import summarize_company

router = APIRouter()


class AnalyzeRequest(BaseModel):
    name: str
    description: str
    website: str = ""


@router.get("")
async def list_companies() -> list[dict]:
    result = (
        get_supabase()
        .table("companies")
        .select("*")
        .order("score", desc=True)
        .limit(50)
        .execute()
    )
    return result.data  # type: ignore[return-value]


@router.get("/{company_id}")
async def get_company(company_id: str) -> dict:
    result = (
        get_supabase()
        .table("companies")
        .select("*, founders(*), funding_events(*)")
        .eq("id", company_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Company not found")
    return result.data  # type: ignore[return-value]


@router.post("/analyze")
async def analyze_company(req: AnalyzeRequest) -> dict:
    summary = await summarize_company(
        name=req.name,
        description=req.description,
        website=req.website,
    )
    score_result = await score_company(
        summary=summary,
        raw_description=req.description,
    )

    record: dict = {
        "name": summary.get("name") or req.name,
        "website": req.website or None,
        "description": req.description,
        "summary": summary.get("one_line_description"),
        "score": score_result.get("score"),
        "score_reason": score_result,
        "source": "manual",
        "raw_data": {"summary": summary},
    }

    result = (
        get_supabase()
        .table("companies")
        .upsert(record, on_conflict="name,source")
        .execute()
    )
    return result.data[0] if result.data else record  # type: ignore[index]
