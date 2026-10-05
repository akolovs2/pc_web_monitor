import sys
import os
import json
import asyncio
import struct
import subprocess
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.auth_service import verify_token, ACCESS_COOKIE

router = APIRouter()

IS_LINUX = sys.platform != "win32"

if IS_LINUX:
    import pty
    import termios
    import fcntl


def set_pty_size(fd: int, rows: int, cols: int):
    """Update PTY window size in kernel."""
    if IS_LINUX:
        try:
            winsize = struct.pack("HHHH", rows, cols, 0, 0)
            fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
        except OSError:
            pass


@router.get("/terminal/info")
async def terminal_info():
    """Returns basic environment information for the terminal."""
    return {
        "os": sys.platform,
        "is_linux": IS_LINUX,
        "shell": os.environ.get("SHELL", "/bin/bash"),
    }


@router.websocket("/ws/terminal")
async def terminal_websocket(websocket: WebSocket):
    # 1. Authenticate via cookie or query parameter
    token = websocket.cookies.get(ACCESS_COOKIE) or websocket.query_params.get("token")
    username = verify_token(token, "access") if token else None

    if not username:
        await websocket.accept()
        await websocket.send_text(
            "\r\n\x1b[1;31m[Authentication Failed: Invalid or expired session. Please log in again.]\x1b[0m\r\n"
        )
        await websocket.close(code=4001)
        return

    await websocket.accept()

    # If running on non-Linux (e.g. Windows development environment)
    if not IS_LINUX:
        await websocket.send_text(
            f"\r\n\x1b[1;33m[Dev Mode]\x1b[0m Connected as \x1b[1;36m{username}\x1b[0m on {sys.platform}.\r\n"
            "Native PTY interactive shell requires Linux and runs automatically when deployed to your Linux host.\r\n\r\n"
            "$ "
        )
        try:
            while True:
                msg = await websocket.receive_text()
                try:
                    payload = json.loads(msg)
                    if payload.get("type") == "input":
                        data = payload.get("data", "")
                        # Echo back for local testing
                        if data == "\r":
                            await websocket.send_text("\r\n$ ")
                        elif data == "\x7f":  # Backspace
                            await websocket.send_text("\b \b")
                        else:
                            await websocket.send_text(data)
                except json.JSONDecodeError:
                    await websocket.send_text(msg)
        except WebSocketDisconnect:
            return

    # On Linux: Allocate real pseudo-terminal (PTY) and spawn login shell
    master_fd, slave_fd = pty.openpty()

    # Default initial size 80x24 (client immediately sends its exact cols/rows)
    set_pty_size(master_fd, 24, 80)

    # Set master_fd to non-blocking IO
    flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
    fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

    env = os.environ.copy()
    env["TERM"] = "xterm-256color"
    env["COLORTERM"] = "truecolor"
    env["USER"] = username
    shell = env.get("SHELL", "/bin/bash")

    user_home = os.path.expanduser(f"~{username}")
    cwd = user_home if os.path.isdir(user_home) else os.path.expanduser("~")

    # Spawn shell in new session
    proc = subprocess.Popen(
        [shell, "-l"],
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        preexec_fn=os.setsid,
        close_fds=True,
        env=env,
        cwd=cwd
    )
    os.close(slave_fd)

    loop = asyncio.get_running_loop()
    closed = False

    def on_pty_readable():
        nonlocal closed
        if closed:
            return
        try:
            data = os.read(master_fd, 4096)
            if data:
                asyncio.create_task(
                    websocket.send_text(data.decode("utf-8", errors="replace"))
                )
        except OSError:
            # EIO occurs when child process terminates (e.g. exit command)
            if not closed:
                closed = True
                asyncio.create_task(websocket.close())

    loop.add_reader(master_fd, on_pty_readable)

    try:
        while True:
            msg = await websocket.receive_text()
            try:
                payload = json.loads(msg)
                msg_type = payload.get("type")
                if msg_type == "input":
                    raw = payload.get("data", "")
                    if raw:
                        os.write(master_fd, raw.encode("utf-8"))
                elif msg_type == "resize":
                    cols = int(payload.get("cols", 80))
                    rows = int(payload.get("rows", 24))
                    set_pty_size(master_fd, rows, cols)
                elif msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                # Raw text fallback
                os.write(master_fd, msg.encode("utf-8"))
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        closed = True
        try:
            loop.remove_reader(master_fd)
        except Exception:
            pass
        try:
            os.close(master_fd)
        except OSError:
            pass
        if proc.poll() is None:
            try:
                proc.terminate()
                proc.wait(timeout=1.0)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
