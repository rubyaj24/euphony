from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from datetime import timedelta
from core.database import get_db
from core.security import create_access_token, decode_token
from core.config import get_settings
import httpx
import uuid
from urllib.parse import urlencode

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def google_subject_to_uuid(google_subject: str) -> str:
    # Keep a stable UUID for each Google account while preserving UUID column types.
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"google-oauth:{google_subject}"))


async def ensure_neon_auth_user(conn, user_id: str, email: str, name: str | None, picture: str | None, email_verified: bool):
    existing = await conn.fetchrow(
        'SELECT id FROM neon_auth."user" WHERE id = $1 OR email = $2 LIMIT 1',
        user_id,
        email,
    )

    if existing:
        await conn.execute(
            'UPDATE neon_auth."user" SET name = $1, image = $2, "emailVerified" = $3, "updatedAt" = NOW() WHERE id = $4',
            name or "",
            picture,
            email_verified,
            existing["id"],
        )
        return str(existing["id"])

    await conn.execute(
        'INSERT INTO neon_auth."user" (id, name, email, "emailVerified", image) VALUES ($1, $2, $3, $4, $5)',
        user_id,
        name or "",
        email,
        email_verified,
        picture,
    )
    return user_id


async def ensure_neon_auth_google_account(
    conn,
    neon_user_id: str,
    google_subject: str,
    token_response: dict,
):
    existing = await conn.fetchrow(
        'SELECT id FROM neon_auth.account WHERE "providerId" = $1 AND "accountId" = $2 LIMIT 1',
        "google",
        google_subject,
    )

    if existing:
        await conn.execute(
            'UPDATE neon_auth.account SET "accessToken" = $1, "refreshToken" = $2, "idToken" = $3, scope = $4, "updatedAt" = NOW() WHERE id = $5',
            token_response.get("access_token"),
            token_response.get("refresh_token"),
            token_response.get("id_token"),
            token_response.get("scope"),
            existing["id"],
        )
        return

    await conn.execute(
        'INSERT INTO neon_auth.account ("accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", scope, "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
        google_subject,
        "google",
        neon_user_id,
        token_response.get("access_token"),
        token_response.get("refresh_token"),
        token_response.get("id_token"),
        token_response.get("scope"),
    )


@router.get("/google")
async def google_login(request: Request):
    import secrets
    state = secrets.token_urlsafe(32)
    
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"state={state}&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    
    return {"url": google_auth_url, "state": state}


@router.get("/google/callback")
async def google_callback(request: Request, code: str = None, state: str = None, pool=Depends(get_db)):
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    
    async with pool.acquire() as conn:
        token_response = await exchange_code_for_token(code)
        
        if "error" in token_response:
            raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_response}")
        
        access_token = token_response.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail=f"No access token: {token_response}")
        
        user_info = await get_google_user_info(access_token)
        
        if "error" in user_info or ("id" not in user_info and "sub" not in user_info):
            raise HTTPException(status_code=400, detail=f"Failed to get user info: {user_info}")
        
        google_subject = user_info.get("id") or user_info.get("sub")
        user_id = google_subject_to_uuid(google_subject)
        email = user_info.get("email", "").lower()
        name = user_info.get("name")
        picture = user_info.get("picture")
        email_verified = bool(user_info.get("verified_email", False))

        neon_user_id = await ensure_neon_auth_user(
            conn,
            user_id,
            email,
            name,
            picture,
            email_verified,
        )
        await ensure_neon_auth_google_account(
            conn,
            neon_user_id,
            google_subject,
            token_response,
        )
        
        existing_user = await conn.fetchrow(
            "SELECT user_id, role FROM roles WHERE user_id = $1",
            user_id
        )
        
        if not existing_user:
            await conn.execute(
                "INSERT INTO roles (user_id, email, role) VALUES ($1, $2, 'user')",
                user_id, email
            )
        
        role = existing_user["role"] if existing_user else "user"
        
        jwt_token = create_access_token(
            data={
                "sub": neon_user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "role": role,
            }
        )
    
    from fastapi.responses import RedirectResponse
    callback_params = urlencode({
        "token": jwt_token,
        "user_id": neon_user_id,
        "email": email,
    })
    redirect_url = f"{settings.FRONTEND_URL.rstrip('/')}/auth-callback?{callback_params}"
    return RedirectResponse(url=redirect_url)


async def exchange_code_for_token(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
        )
        return response.json()


async def get_google_user_info(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        return response.json()


@router.get("/me")
async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"user": None}
    
    token = auth_header.split(" ")[1]
    try:
        payload = decode_token(token)
        return {
            "user": {
                "id": payload.get("sub"),
                "email": payload.get("email"),
                "name": payload.get("name"),
                "picture": payload.get("picture"),
                "role": payload.get("role", "user"),
            }
        }
    except:
        return {"user": None}


@router.post("/logout")
async def logout():
    response = JSONResponse({"success": True})
    response.delete_cookie("access_token")
    response.delete_cookie("oauth_state")
    return response


@router.post("/refresh")
async def refresh_token(request: Request, pool=Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    
    token = auth_header.split(" ")[1]
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        
        async with pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT user_id, email, role FROM roles WHERE user_id = $1",
                user_id
            )
            
            if not user:
                role = payload.get("role", "user")
            else:
                role = user["role"]
        
        new_token = create_access_token(
            data={
                "sub": user_id,
                "email": payload.get("email"),
                "name": payload.get("name"),
                "picture": payload.get("picture"),
                "role": role,
            }
        )
        
        response = JSONResponse({"success": True, "token": new_token})
        response.set_cookie(
            key="access_token",
            value=new_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")
