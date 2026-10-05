from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from app.services.auth_service import (
    AuthService,
    ACCESS_COOKIE,
    REFRESH_COOKIE,
)
from app.dependencies import get_auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = None
    ssh_key: Optional[str] = None
    passphrase: Optional[str] = None
    auth_type: str = "password"  # "password" | "ssh_key"


@router.post("/login")
async def login(
    req: LoginRequest,
    response: Response,
    auth_svc: AuthService = Depends(get_auth_service),
):
    clean_username = req.username.strip()
    if not clean_username:
        raise HTTPException(status_code=400, detail="Username is required")

    # 1. SSH Key Authentication
    if req.auth_type == "ssh_key" or (req.ssh_key and not req.password):
        if not req.ssh_key or not req.ssh_key.strip():
            raise HTTPException(status_code=400, detail="SSH private key content is required")
        success, message = await auth_svc.login_ssh_key(
            username=clean_username,
            key_content=req.ssh_key,
            passphrase=req.passphrase.strip() if req.passphrase else None,
        )
    # 2. Password Authentication (PAM or SSH loopback)
    else:
        if not req.password:
            raise HTTPException(status_code=400, detail="Password is required")
        success, message = await auth_svc.login_password(
            username=clean_username,
            password=req.password,
        )

    if not success:
        raise HTTPException(status_code=401, detail=message)

    # Issue session tokens
    access_token = auth_svc.create_access_token(clean_username)
    refresh_token = auth_svc.create_refresh_token(clean_username)
    auth_svc.set_auth_cookies(response, access_token, refresh_token)

    return {
        "success": True,
        "username": clean_username,
        "message": message,
    }


@router.post("/refresh")
async def refresh(
    request: Request,
    response: Response,
    auth_svc: AuthService = Depends(get_auth_service),
):
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    username = auth_svc.verify_token(token, "refresh")
    if not username:
        auth_svc.clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    new_access = auth_svc.create_access_token(username)
    new_refresh = auth_svc.create_refresh_token(username)
    auth_svc.set_auth_cookies(response, new_access, new_refresh)

    return {"success": True, "username": username}


@router.post("/logout")
async def logout(
    response: Response,
    auth_svc: AuthService = Depends(get_auth_service),
):
    auth_svc.clear_auth_cookies(response)
    return {"success": True, "message": "Logged out successfully"}


@router.get("/me")
async def get_me(
    request: Request,
    auth_svc: AuthService = Depends(get_auth_service),
):
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    username = auth_svc.verify_token(token, "access")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return {
        "authenticated": True,
        "username": username,
    }