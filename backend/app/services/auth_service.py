from jose import jwt, JWTError
from fastapi import HTTPException, Request
from app.config import config

ALGORITHM = "HS256"
ACCESS_COOKIE = "access_token"

def verify_token(token: str, token_type: str) -> str | None:
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload.get("sub")
    except JWTError:
        return None

async def get_current_user(request: Request) -> str:
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    username = verify_token(token, "access")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return username
