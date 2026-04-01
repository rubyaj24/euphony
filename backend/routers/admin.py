from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import Optional
from core.database import get_db
from schemas import (
    SettingsUpdate, SettingsResponse, NextCategoryResponse, 
    AdminStatusResponse, Category, CATEGORY_ORDER, CATEGORIES
)
from core.security import decode_token

router = APIRouter(prefix="/admin", tags=["admin"])


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


async def get_current_user_email(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    try:
        payload = decode_token(token)
        return payload.get("email", "").lower()
    except:
        return None


async def check_admin(pool, user_id: str, email: str) -> bool:
    session_role = None
    
    async with pool.acquire() as conn:
        role = await conn.fetchrow(
            "SELECT role FROM roles WHERE user_id = $1",
            user_id
        )
        if role:
            session_role = role["role"].lower()
        
        if session_role == "admin":
            return True
        
        admin_by_id = await conn.fetchrow(
            "SELECT role FROM roles WHERE user_id = $1 AND role = 'admin'",
            user_id
        )
        if admin_by_id:
            return True
        
        admin_by_email = await conn.fetchrow(
            "SELECT role FROM roles WHERE email ILIKE $1 AND role = 'admin'",
            email
        )
        if admin_by_email:
            return True
    
    return False


async def require_admin(request: Request, pool) -> bool:
    user_id = await get_current_user_id(request)
    email = await get_current_user_email(request)
    
    if not user_id and not email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    is_admin = await check_admin(pool, user_id, email)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return True


@router.get("/status", response_model=AdminStatusResponse)
async def get_admin_status(request: Request, pool=Depends(get_db)):
    user_id = await get_current_user_id(request)
    email = await get_current_user_email(request)
    
    if not user_id and not email:
        return AdminStatusResponse(isAdmin=False)
    
    is_admin = await check_admin(pool, user_id or "", email or "") if user_id or email else False
    return AdminStatusResponse(isAdmin=is_admin)


@router.post("/toggle-category", response_model=SettingsResponse)
async def toggle_category(
    request: Request,
    body: SettingsUpdate,
    pool=Depends(get_db)
):
    await require_admin(request, pool)
    
    setting_key = f"voting_{body.key}" if not body.key.startswith("voting_") else body.key
    
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT key FROM settings WHERE key = $1",
            setting_key
        )
        
        if existing:
            await conn.execute(
                "UPDATE settings SET value = $1 WHERE key = $2",
                "true" if body.enabled else "false",
                setting_key
            )
        else:
            await conn.execute(
                "INSERT INTO settings (key, value) VALUES ($1, $2)",
                setting_key,
                "true" if body.enabled else "false"
            )
    
    return SettingsResponse(success=True, key=setting_key, enabled=body.enabled)


@router.post("/next-category", response_model=NextCategoryResponse)
async def next_category(request: Request, pool=Depends(get_db)):
    await require_admin(request, pool)
    
    async with pool.acquire() as conn:
        settings = await conn.fetch("SELECT key, value FROM settings WHERE key LIKE 'voting_%'")
        
        current_enabled = None
        for s in settings:
            if s["value"] == "true" and s["key"].startswith("voting_"):
                current_enabled = s["key"].replace("voting_", "")
                break
        
        await conn.execute("UPDATE settings SET value = 'false' WHERE key LIKE 'voting_%'")
        
        if current_enabled and current_enabled in CATEGORY_ORDER:
            idx = CATEGORY_ORDER.index(current_enabled)
            if idx < len(CATEGORY_ORDER) - 1:
                next_cat = CATEGORY_ORDER[idx + 1]
                await conn.execute(
                    "INSERT INTO settings (key, value) VALUES ($1, 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'",
                    f"voting_{next_cat}"
                )
                return NextCategoryResponse(
                    success=True,
                    new_category=Category(next_cat),
                    message=f"Advanced to {next_cat}"
                )
        
        return NextCategoryResponse(
            success=True,
            new_category=None,
            message="All voting categories completed"
        )


@router.get("/results")
async def get_results(request: Request, pool=Depends(get_db)):
    await require_admin(request, pool)
    
    async with pool.acquire() as conn:
        results = await conn.fetch("""
            SELECT 
                f.uuid_id,
                f.name,
                f.semester,
                f.department,
                f.track,
                f.round,
                COUNT(v.id) as vote_count
            FROM finalists f
            LEFT JOIN votes v ON f.id = v.finalist_id
            GROUP BY f.id, f.uuid_id, f.name, f.semester, f.department, f.track, f.round
            ORDER BY f.track, f.round, vote_count DESC
        """)
    
    return [
        {
            "uuid_id": str(r["uuid_id"]),
            "name": r["name"],
            "semester": r["semester"],
            "department": r["department"],
            "track": r["track"],
            "round": r["round"],
            "votes": r["vote_count"],
        }
        for r in results
    ]
