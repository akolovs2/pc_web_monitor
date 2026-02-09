# app/services/auth_service.py
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, Request, Response
from app.config import config
from app.models.database import database

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"

pwd_context = CryptContext(schemes=["bcrypt"])

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_access_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": username, "exp": expire, "type": "access"}, config.JWT_SECRET, algorithm=ALGORITHM)

def create_refresh_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": username, "exp": expire, "type": "refresh"}, config.JWT_SECRET, algorithm=ALGORITHM)

def verify_token(token: str, token_type: str) -> str | None:
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload.get("sub")
    except JWTError:
        return None

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=config.SECURE_COOKIES
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=config.SECURE_COOKIES
    )

def clear_auth_cookies(response: Response):
    response.delete_cookie(ACCESS_COOKIE)
    response.delete_cookie(REFRESH_COOKIE)

async def get_current_user(request: Request) -> str:
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    username = verify_token(token, "access")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return username

async def login_user(username: str, password: str) -> dict | None:
    row = await database.fetch_one(
        "SELECT id, password_hash FROM users WHERE username = :username",
        {"username": username}
    )
    if not row or not verify_password(password, row["password_hash"]):
        return None
    
    access_token = create_access_token(username)
    refresh_token = create_refresh_token(username)
    
    await database.execute(
        "UPDATE users SET refresh_token = :token WHERE id = :id",
        {"token": refresh_token, "id": row["id"]}
    )
    
    return {"access_token": access_token, "refresh_token": refresh_token}

async def refresh_tokens(refresh_token: str) -> dict | None:
    username = verify_token(refresh_token, "refresh")
    if not username:
        return None
    
    row = await database.fetch_one(
        "SELECT id, refresh_token FROM users WHERE username = :username",
        {"username": username}
    )
    if not row or row["refresh_token"] != refresh_token:
        return None
    
    new_access = create_access_token(username)
    new_refresh = create_refresh_token(username)
    
    await database.execute(
        "UPDATE users SET refresh_token = :token WHERE id = :id",
        {"token": new_refresh, "id": row["id"]}
    )
    
    return {"access_token": new_access, "refresh_token": new_refresh, "username": username}

async def logout_user(refresh_token: str):
    if refresh_token:
        username = verify_token(refresh_token, "refresh")
        if username:
            await database.execute(
                "UPDATE users SET refresh_token = NULL WHERE username = :username",
                {"username": username}
            )