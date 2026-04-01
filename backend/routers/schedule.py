from fastapi import APIRouter, Depends

try:
    from core.database import get_db
except ModuleNotFoundError:
    from backend.core.database import get_db

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.get("")
async def get_schedule(pool=Depends(get_db)):
    return {
        "schedule": [
            {"time": "05:30 PM", "track": "Eastern", "round": "Duet", "venue": "Main Stage"},
            {"time": "06:00 PM", "track": "Western", "round": "Duet", "venue": "Main Stage"},
            {"time": "06:30 PM", "track": "Eastern", "round": "Solo", "venue": "Main Stage"},
            {"time": "07:00 PM", "track": "Western", "round": "Solo", "venue": "Main Stage"},
        ]
    }
