"""Authentication application service coordinating host authentication and JWT sessions."""
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from jose import jwt, JWTError
from fastapi import HTTPException, Request, Response
from app.domain.ports import ILinuxAuthenticator
from app.infrastructure.auth.linux_authenticator import LinuxAuthenticator
from app.config import config

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 14
ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


class AuthService:
    """Application service for host authentication and session token lifecycle."""

    def __init__(self, authenticator: Optional[ILinuxAuthenticator] = None):
        self._authenticator = authenticator or LinuxAuthenticator()

    async def login_password(self, username: str, password: str) -> Tuple[bool, str]:
        return await self._authenticator.authenticate_password(username, password)

    async def login_ssh_key(
        self,
        username: str,
        key_content: str,
        passphrase: Optional[str] = None
    ) -> Tuple[bool, str]:
        return await self._authenticator.authenticate_ssh_key(username, key_content, passphrase)

    def create_access_token(self, username: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        return jwt.encode(
            {"sub": username, "exp": expire, "type": "access"},
            config.JWT_SECRET,
            algorithm=ALGORITHM,
        )

    def create_refresh_token(self, username: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        return jwt.encode(
            {"sub": username, "exp": expire, "type": "refresh"},
            config.JWT_SECRET,
            algorithm=ALGORITHM,
        )

    def verify_token(self, token: str, token_type: str = "access") -> Optional[str]:
        try:
            payload = jwt.decode(token, config.JWT_SECRET, algorithms=[ALGORITHM])
            if payload.get("type") != token_type:
                return None
            return payload.get("sub")
        except JWTError:
            return None

    def set_auth_cookies(self, response: Response, access_token: str, refresh_token: str) -> None:
        response.set_cookie(
            key=ACCESS_COOKIE,
            value=access_token,
            httponly=True,
            samesite="lax",
            secure=config.SECURE_COOKIES,
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/"
        )
        response.set_cookie(
            key=REFRESH_COOKIE,
            value=refresh_token,
            httponly=True,
            samesite="lax",
            secure=config.SECURE_COOKIES,
            max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            path="/"
        )

    def clear_auth_cookies(self, response: Response) -> None:
        response.delete_cookie(ACCESS_COOKIE, path="/")
        response.delete_cookie(REFRESH_COOKIE, path="/")

    def get_current_user_from_request(self, request: Request) -> str:
        token = request.cookies.get(ACCESS_COOKIE)
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        username = self.verify_token(token, "access")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        return username


# Global default instance and helpers for backward compatibility
_default_auth_service = AuthService()

create_access_token = _default_auth_service.create_access_token
create_refresh_token = _default_auth_service.create_refresh_token
verify_token = _default_auth_service.verify_token
set_auth_cookies = _default_auth_service.set_auth_cookies
clear_auth_cookies = _default_auth_service.clear_auth_cookies
authenticate_linux_password = _default_auth_service.login_password
authenticate_linux_ssh_key = _default_auth_service.login_ssh_key


async def get_current_user(request: Request) -> str:
    return _default_auth_service.get_current_user_from_request(request)
