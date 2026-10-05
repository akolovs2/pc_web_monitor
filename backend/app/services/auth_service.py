import sys
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from jose import jwt, JWTError
from fastapi import HTTPException, Request, Response
from app.config import config

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 14
ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"

IS_LINUX = sys.platform != "win32"


def create_access_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": username, "exp": expire, "type": "access"},
        config.JWT_SECRET,
        algorithm=ALGORITHM
    )


def create_refresh_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": username, "exp": expire, "type": "refresh"},
        config.JWT_SECRET,
        algorithm=ALGORITHM
    )


def verify_token(token: str, token_type: str = "access") -> Optional[str]:
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload.get("sub")
    except JWTError:
        return None


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
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


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")


async def get_current_user(request: Request) -> str:
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    username = verify_token(token, "access")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return username


def _try_pam_authenticate(username: str, password: str) -> bool:
    """Attempts PAM authentication if pamela is available on Linux."""
    try:
        import pamela
        for service in ("sshd", "login", "common-auth"):
            try:
                pamela.authenticate(username, password, service=service)
                return True
            except pamela.PAMError:
                continue
        return False
    except Exception:
        return False


async def authenticate_linux_password(username: str, password: str) -> Tuple[bool, str]:
    """
    Authenticates username and password directly against the Linux host:
    1. Attempts PAM authentication via pamela if available.
    2. Falls back to loopback SSH handshake (127.0.0.1:22).
    """
    if not username or not password:
        return False, "Username and password are required"

    # 1. Try PAM if available
    if IS_LINUX and _try_pam_authenticate(username, password):
        return True, "PAM authentication successful"

    # 2. Try SSH loopback handshake
    import asyncssh
    try:
        async with asyncssh.connect(
            host=config.SSH_HOST,
            port=config.SSH_PORT,
            username=username,
            password=password,
            known_hosts=None
        ):
            return True, "SSH authentication successful"
    except asyncssh.PermissionDenied:
        return False, "Invalid Linux username or password"
    except (ConnectionRefusedError, OSError) as e:
        # If running locally on Windows dev machine without local SSH
        if not IS_LINUX:
            if username == "admin" and password == "admin":
                return True, "Dev mode fallback authentication successful"
            return False, f"Dev Mode: Local SSH ({config.SSH_HOST}:{config.SSH_PORT}) unreachable. Use admin/admin for dev."
        return False, f"Host SSH daemon ({config.SSH_HOST}:{config.SSH_PORT}) is unreachable: {e}"
    except Exception as e:
        return False, f"Authentication error: {str(e)}"


async def authenticate_linux_ssh_key(
    username: str,
    key_content: str,
    passphrase: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Authenticates by attempting an SSH handshake to the local host (127.0.0.1:22)
    using the provided private key (id_rsa, id_ed25519, etc.).
    The host sshd verifies the key against ~/.ssh/authorized_keys.
    """
    if not username or not key_content:
        return False, "Username and SSH private key are required"

    import asyncssh
    try:
        # Import the private key (supports RSA, Ed25519, ECDSA, OpenSSH format, PKCS8)
        client_key = asyncssh.import_private_key(key_content.strip(), passphrase=passphrase)
    except asyncssh.KeyImportError as e:
        return False, f"Invalid SSH private key format or incorrect passphrase: {e}"
    except Exception as e:
        return False, f"Failed to parse private key: {e}"

    try:
        async with asyncssh.connect(
            host=config.SSH_HOST,
            port=config.SSH_PORT,
            username=username,
            client_keys=[client_key],
            known_hosts=None
        ):
            return True, "SSH key authentication successful"
    except asyncssh.PermissionDenied:
        return False, f"SSH key was rejected by host for user '{username}'. Ensure public key is in ~/.ssh/authorized_keys"
    except (ConnectionRefusedError, OSError) as e:
        if not IS_LINUX:
            return False, f"Dev Mode: Host SSH daemon ({config.SSH_HOST}:{config.SSH_PORT}) is unreachable on Windows."
        return False, f"Host SSH daemon ({config.SSH_HOST}:{config.SSH_PORT}) is unreachable: {e}"
    except Exception as e:
        return False, f"SSH key authentication error: {str(e)}"
