from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.responses import JSONResponse
from typing import Optional
from asyncpg.exceptions import UniqueViolationError
from core.database import get_db
from schemas import (
    VoteCreate, VoteResponse, VoteCheck, VoteCountsResponse, 
    VotingStatus, Category, CATEGORIES
)
from core.security import decode_token

router = APIRouter(prefix="/votes", tags=["votes"])


async def get_current_user_id(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    try:
        payload = decode_token(token)
        return payload.get("sub")
    except:
        return None


async def get_voting_status(pool) -> dict:
    async with pool.acquire() as conn:
        settings = await conn.fetch("SELECT key, value FROM settings WHERE key LIKE 'voting_%'")
    
    status_dict = {
        "voting_duet_eastern": False,
        "voting_duet_western": False,
        "voting_solo_eastern": False,
        "voting_solo_western": False,
        "active_category": None,
    }
    
    valid_setting_keys = {f"voting_{category}" for category in CATEGORIES}

    for s in settings:
        if s["key"] in valid_setting_keys:
            status_dict[s["key"]] = s["value"] == "true"
    
    active_categories = [k for k, v in status_dict.items() if v and k.startswith("voting_")]
    if active_categories:
        category = active_categories[0].replace("voting_", "")
        status_dict["active_category"] = category
    
    return status_dict


@router.get("", response_model=VoteCountsResponse)
async def get_vote_counts(pool=Depends(get_db)):
    async with pool.acquire() as conn:
        votes = await conn.fetch("""
            SELECT finalist_id, COUNT(*) as count 
            FROM votes 
            GROUP BY finalist_id
        """)
        
        finalists = await conn.fetch("SELECT id, uuid_id FROM finalists")
    
    uuid_map = {f["id"]: str(f["uuid_id"]) for f in finalists}
    counts = {str(uuid_map.get(v["finalist_id"], "")): v["count"] for v in votes}
    
    for f in finalists:
        uuid_str = str(f["uuid_id"])
        if uuid_str not in counts:
            counts[uuid_str] = 0
    
    return {"counts": counts}


@router.get("/status", response_model=VotingStatus)
async def get_voting_status_endpoint(pool=Depends(get_db)):
    status_data = await get_voting_status(pool)
    return VotingStatus(**status_data)


@router.get("/check")
async def check_user_vote(
    request: Request,
    track: str,
    round: str,
    pool=Depends(get_db)
):
    user_id = await get_current_user_id(request)
    if not user_id:
        return {"hasVoted": False, "votedFinalistId": None}
    
    category = f"{round.lower()}_{track.lower()}"
    
    async with pool.acquire() as conn:
        vote = await conn.fetchrow("""
            SELECT v.finalist_id, f.uuid_id
            FROM votes v
            JOIN finalists f ON v.finalist_id = f.id
            WHERE v.user_id = $1 AND v.category = $2
            LIMIT 1
        """, user_id, category)
    
    return {
        "hasVoted": vote is not None,
        "votedFinalistId": str(vote["uuid_id"]) if vote else None
    }


@router.post("", response_model=VoteResponse)
async def submit_vote(
    request: Request,
    body: VoteCreate,
    pool=Depends(get_db)
):
    user_id = await get_current_user_id(request)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )
    
    category = body.category.value
    status_data = await get_voting_status(pool)
    
    if not status_data.get(f"voting_{category}", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Voting for {category} is not enabled"
        )
    
    async with pool.acquire() as conn:
        finalist = await conn.fetchrow(
            "SELECT id, uuid_id, track, round FROM finalists WHERE uuid_id = $1",
            body.finalist_id
        )
        
        if not finalist:
            raise HTTPException(status_code=400, detail="Invalid finalist_id")

        finalist_category = f"{str(finalist['round']).lower()}_{str(finalist['track']).lower()}"
        if finalist_category != category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Finalist does not belong to selected category"
            )
        
        existing = await conn.fetchrow(
            "SELECT id FROM votes WHERE user_id = $1 AND category = $2",
            user_id, category
        )
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already voted in this category"
            )

        try:
            await conn.execute(
                "INSERT INTO votes (user_id, finalist_id, category) VALUES ($1, $2, $3)",
                user_id, finalist["id"], category
            )
        except UniqueViolationError:
            # Database-level safety for concurrent requests.
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already voted in this category"
            )
    
    return VoteResponse(success=True, message="Vote submitted successfully")
