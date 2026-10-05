"""Linux and SSH authenticator adapter implementing ILinuxAuthenticator."""
import sys
from typing import Tuple, Optional
from app.domain.ports import ILinuxAuthenticator
from app.config import config

IS_LINUX = sys.platform != "win32"


class LinuxAuthenticator(ILinuxAuthenticator):
    """Concrete authenticator adapter against Linux PAM and local OpenSSH daemon."""

    def __init__(self, host: str = config.SSH_HOST, port: int = config.SSH_PORT):
        self.host = host
        self.port = port

    def _try_pam(self, username: str, password: str) -> bool:
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

    async def authenticate_password(self, username: str, password: str) -> Tuple[bool, str]:
        if not username or not password:
            return False, "Username and password are required"

        # 1. Try PAM if available on Linux
        if IS_LINUX and self._try_pam(username, password):
            return True, "PAM authentication successful"

        # 2. Try async SSH loopback handshake
        import asyncssh
        try:
            async with asyncssh.connect(
                host=self.host,
                port=self.port,
                username=username,
                password=password,
                known_hosts=None
            ):
                return True, "SSH authentication successful"
        except asyncssh.PermissionDenied:
            return False, "Invalid Linux username or password"
        except (ConnectionRefusedError, OSError) as e:
            if not IS_LINUX:
                if username == "admin" and password == "admin":
                    return True, "Dev mode fallback authentication successful"
                return False, f"Dev Mode: Local SSH ({self.host}:{self.port}) unreachable. Use admin/admin for dev."
            return False, f"Host SSH daemon ({self.host}:{self.port}) unreachable: {e}"
        except Exception as e:
            return False, f"Authentication error: {str(e)}"

    async def authenticate_ssh_key(
        self,
        username: str,
        key_content: str,
        passphrase: Optional[str] = None
    ) -> Tuple[bool, str]:
        if not username or not key_content:
            return False, "Username and SSH private key are required"

        import asyncssh
        try:
            client_key = asyncssh.import_private_key(key_content.strip(), passphrase=passphrase)
        except asyncssh.KeyImportError as e:
            return False, f"Invalid SSH private key format or incorrect passphrase: {e}"
        except Exception as e:
            return False, f"Failed to parse private key: {e}"

        try:
            async with asyncssh.connect(
                host=self.host,
                port=self.port,
                username=username,
                client_keys=[client_key],
                known_hosts=None
            ):
                return True, "SSH key authentication successful"
        except asyncssh.PermissionDenied:
            return False, f"SSH key was rejected by host for user '{username}'. Ensure public key is in ~/.ssh/authorized_keys"
        except (ConnectionRefusedError, OSError) as e:
            if not IS_LINUX:
                return False, f"Dev Mode: Host SSH daemon ({self.host}:{self.port}) is unreachable on Windows."
            return False, f"Host SSH daemon ({self.host}:{self.port}) unreachable: {e}"
        except Exception as e:
            return False, f"SSH key authentication error: {str(e)}"
