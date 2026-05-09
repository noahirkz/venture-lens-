from fastapi import APIRouter

router = APIRouter()


# Mount feature routers here as they are built, e.g.:
# from app.api.v1 import startups, signals, analysis
# router.include_router(startups.router, prefix="/startups", tags=["startups"])


@router.get("/ping")
async def ping() -> dict[str, str]:
    return {"message": "pong"}
