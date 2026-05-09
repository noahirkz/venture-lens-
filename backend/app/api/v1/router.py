from fastapi import APIRouter

from app.api.v1.companies import router as companies_router
from app.api.v1.scraper import router as scraper_router

router = APIRouter()

router.include_router(companies_router, prefix="/companies", tags=["companies"])
router.include_router(scraper_router, prefix="/scraper", tags=["scraper"])


@router.get("/ping")
async def ping() -> dict[str, str]:
    return {"message": "pong"}
