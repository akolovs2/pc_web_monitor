# Process management service for killing processes by PID, but deprecated in favor of container management. Kept for potential future use or reference.
import sys
import os
import signal
import subprocess
from app.models.schemas import KillResponse

def kill_process(pid: int) -> KillResponse:
    try:
        if sys.platform == 'win32':
            result = subprocess.run(
                ['taskkill', '/F', '/PID', str(pid)],
                capture_output=True,
                text=True
            )
            success = result.returncode == 0
            message = result.stderr.strip() if not success else f"Process {pid} terminated"
        else:
            os.kill(pid, signal.SIGKILL)
            success = True
            message = f"Process {pid} terminated"
        
        return KillResponse(success=success, message=message)
    
    except ProcessLookupError:
        return KillResponse(success=False, message="Process not found")
    except PermissionError:
        return KillResponse(success=False, message="Permission denied - run as administrator")
    except Exception as e:
        return KillResponse(success=False, message=str(e))