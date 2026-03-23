from fastapi import APIRouter, HTTPException, Response, Request, Depends
from app.models.schemas import LoginRequest, AuthResponse
from app.services import auth_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/auth")

@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, response: Response):
    tokens = await auth_service.login_user(data.username, data.password)
    if not tokens:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    auth_service.set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"])
    return {"success": True, "username": data.username}

@router.post("/refresh", response_model=AuthResponse)
async def refresh(request: Request, response: Response):
    refresh_token = request.cookies.get(auth_service.REFRESH_COOKIE)
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    
    tokens = await auth_service.refresh_tokens(refresh_token)
    if not tokens:
        auth_service.clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    auth_service.set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"])
    return {"success": True, "username": tokens["username"]}

@router.post("/logout")
async def logout(request: Request, response: Response):
    refresh_token = request.cookies.get(auth_service.REFRESH_COOKIE)
    await auth_service.logout_user(refresh_token)
    auth_service.clear_auth_cookies(response)
    return {"success": True}

@router.get("/me")
async def me(username: str = Depends(get_current_user)):
    return {"username": username}