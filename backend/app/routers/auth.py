from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request, Response
from app.services.auth_service import (
    authenticate_linux_password,
    authenticate_linux_ssh_key,
    create_access_token,
    create_refresh_token,
    verify_token,
    set_auth_cookies,
    clear_auth_cookies,
    ACCESS_COOKIE,
    REFRESH_COOKIE,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = None
    ssh_key: Optional[str] = None
    passphrase: Optional[str] = None
    auth_type: str = "password"  # "password" | "ssh_key"


@router.post("/login")
async def login(req: LoginRequest, response: Response):
    clean_username = req.username.strip()
    if not clean_username:
        raise HTTPException(status_code=400, detail="Username is required")

    # 1. SSH Key Authentication
    if req.auth_type == "ssh_key" or (req.ssh_key and not req.password):
        if not req.ssh_key or not req.ssh_key.strip():
            raise HTTPException(status_code=400, detail="SSH private key content is required")
        success, message = await authenticate_linux_ssh_key(
            username=clean_username,
            key_content=req.ssh_key,
            passphrase=req.passphrase.strip() if req.passphrase else None,
        )
    # 2. Password Authentication (PAM or SSH loopback)
    else:
        if not req.password:
            raise HTTPException(status_code=400, detail="Password is required")
        success, message = await authenticate_linux_password(
            username=clean_username,
            password=req.password,
        )

    if not success:
        raise HTTPException(status_code=401, detail=message)

    # Issue session tokens
    access_token = create_access_token(clean_username)
    refresh_token = create_refresh_token(clean_username)
    set_auth_cookies(response, access_token, refresh_token)

    return {
        "success": True,
        "username": clean_username,
        "message": message,
    }


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    username = verify_token(token, "refresh")
    if not username:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    new_access = create_access_token(username)
    new_refresh = create_refresh_token(username)
    set_auth_cookies(response, new_access, new_refresh)

    return {"success": True, "username": username}


@router.post("/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"success": True, "message": "Logged out successfully"}


@router.get("/me")
async def get_me(request: Request):
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    username = verify_token(token, "access")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return {
        "authenticated": True,
        "username": username,
    }