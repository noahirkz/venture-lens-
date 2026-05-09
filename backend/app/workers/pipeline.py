"""
Core ingestion pipeline: scrape → summarize → score → upsert.
"""

import asyncio
import logging

from app.core.supabase import get_supabase
from app.intelligence.scorer import score_company
from app.intelligence.summarizer import summarize_company
from app.scrapers.producthunt import scrape_producthunt
from app.scrapers.yc import scrape_yc

logger = logging.getLogger(__name__)


async def _process_company(company: dict) -> dict | None:
    """Summarize + score one scraped company and return a Supabase-ready record."""
    try:
        summary = await summarize_company(
            name=company["name"],
            description=company.get("description", ""),
            website=company.get("website", ""),
        )
        score_result = await score_company(
            summary=summary,
            raw_description=company.get("description", ""),
        )
        return {
            "name": summary.get("name") or company["name"],
            "description": company.get("description"),
            "summary": summary.get("one_line_description"),
            "score": score_result.get("score"),
            "score_reason": score_result,
            "source": company.get("source"),
            "source_url": company.get("source_url"),
            "raw_data": {"summary": summary, "scrape": company},
        }
    except Exception as exc:
        logger.error("Failed to process %s: %s", company.get("name"), exc)
        return None


async def run_pipeline(
    sources: list[str] | None = None,
) -> dict:
    """
    Scrape configured sources, run AI analysis, upsert results to Supabase.

    Args:
        sources: subset of ["producthunt", "yc"]. Defaults to all.

    Returns:
        {"total": int, "processed": int, "errors": int}
    """
    sources = sources or ["producthunt", "yc"]

    scrape_tasks = []
    if "producthunt" in sources:
        scrape_tasks.append(scrape_producthunt())
    if "yc" in sources:
        scrape_tasks.append(scrape_yc())

    scraped_lists = await asyncio.gather(*scrape_tasks)
    companies: list[dict] = [c for batch in scraped_lists for c in batch]
    logger.info("Pipeline: %d companies scraped from %s", len(companies), sources)

    # Process concurrently with a concurrency cap to avoid rate limits
    semaphore = asyncio.Semaphore(5)

    async def _guarded(company: dict) -> dict | None:
        async with semaphore:
            return await _process_company(company)

    records = await asyncio.gather(*[_guarded(c) for c in companies])

    supabase = get_supabase()
    processed = errors = 0

    for record in records:
        if record is None:
            errors += 1
            continue
        try:
            supabase.table("companies").upsert(
                record,
                on_conflict="name,source",
            ).execute()
            processed += 1
        except Exception as exc:
            logger.error("Supabase upsert failed for %s: %s", record.get("name"), exc)
            errors += 1

    logger.info("Pipeline complete — processed=%d errors=%d", processed, errors)
    return {"total": len(companies), "processed": processed, "errors": errors}
