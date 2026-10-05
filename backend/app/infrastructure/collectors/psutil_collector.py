"""Host metrics collector adapter implementing IHostCollector via psutil and socket."""
import os
import socket
import psutil
from typing import List
from app.domain.models import StorageInfo, TaskInfo
from app.domain.ports import IHostCollector
from app.config import config


class PsutilHostCollector(IHostCollector):
    """Concrete host collector utilizing psutil for Linux/Windows host telemetry."""

    def __init__(self, cpu_count: int = config.CPU_COUNT):
        self.cpu_count = max(1, cpu_count)

    def get_hostname(self) -> str:
        try:
            return socket.gethostname()
        except Exception:
            return "localhost"

    def get_cpu_percent(self, interval: float = 1.0) -> float:
        try:
            return float(psutil.cpu_percent(interval=interval))
        except Exception:
            return 0.0

    def get_ram_percent(self) -> float:
        try:
            return float(psutil.virtual_memory().percent)
        except Exception:
            return 0.0

    def get_storage_info(self) -> StorageInfo:
        try:
            path = os.path.abspath(os.sep)
            usage = psutil.disk_usage(path)
            return StorageInfo(
                percent=round(usage.percent, 1),
                used_gb=round(usage.used / (1024 ** 3), 1),
                total_gb=round(usage.total / (1024 ** 3), 1),
                free_gb=round(usage.free / (1024 ** 3), 1),
            )
        except Exception:
            return StorageInfo(percent=0.0, used_gb=0.0, total_gb=0.0, free_gb=0.0)

    def get_tasks(self, limit: int = 50) -> List[TaskInfo]:
        tasks: List[TaskInfo] = []
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
                try:
                    info = proc.info
                    cpu_raw = (info['cpu_percent'] or 0) / self.cpu_count
                    tasks.append(
                        TaskInfo(
                            pid=int(info['pid']),
                            name=str(info['name'] or 'unknown'),
                            cpu=round(cpu_raw, 1),
                            memory=round(info['memory_percent'] or 0, 1),
                            status=str(info['status'] or 'unknown'),
                        )
                    )
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            tasks.sort(key=lambda t: t.memory, reverse=True)
            return tasks[:limit]
        except Exception:
            return []
