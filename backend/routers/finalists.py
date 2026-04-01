from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

try:
    from core.database import get_db
    from schemas import FinalistResponse, DuetResponse
except ModuleNotFoundError:
    from backend.core.database import get_db
    from backend.schemas import FinalistResponse, DuetResponse

router = APIRouter(prefix="/finalists", tags=["finalists"])


@router.get("", response_model=dict)
async def get_finalists(pool=Depends(get_db)):
    async with pool.acquire() as conn:
        finalists = await conn.fetch("""
            SELECT uuid_id, name, semester, department, track, round, avatar_url 
            FROM finalists 
            ORDER BY id
        """)
        
        duets = await conn.fetch("""
            SELECT duet_name, member1_id, member2_id 
            FROM duets
        """)

    finalist_list = [
        {
            "uuid_id": str(f["uuid_id"]),
            "name": f["name"],
            "semester": f["semester"],
            "department": f["department"],
            "track": f["track"],
            "round": f["round"],
            "avatar_url": f["avatar_url"],
        }
        for f in finalists
    ]

    duet_list = [
        {
            "duet_name": d["duet_name"],
            "member1_id": str(d["member1_id"]),
            "member2_id": str(d["member2_id"]),
        }
        for d in duets
    ]

    return {
        "finalists": finalist_list,
        "duets": duet_list,
    }


@router.get("/{uuid_id}")
async def get_finalist(uuid_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        finalist = await conn.fetchrow("""
            SELECT uuid_id, name, semester, department, track, round, avatar_url 
            FROM finalists 
            WHERE uuid_id = $1
        """, uuid_id)

    if not finalist:
        raise HTTPException(status_code=404, detail="Finalist not found")

    return {
        "uuid_id": str(finalist["uuid_id"]),
        "name": finalist["name"],
        "semester": finalist["semester"],
        "department": finalist["department"],
        "track": finalist["track"],
        "round": finalist["round"],
        "avatar_url": finalist["avatar_url"],
    }
