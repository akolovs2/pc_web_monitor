"""Ports (Protocols/Interfaces) defining contracts between Domain and Adapters."""
from typing import Protocol, List, Optional, Tuple
from app.domain.models import (
    StorageInfo,
    ContainerInfo,
    TaskInfo,
    HistoricalMetricPoint,
    ContainerActionResult,
)


class IHostCollector(Protocol):
    """Outbound port for collecting host OS metrics."""
    def get_hostname(self) -> str: ...
    def get_cpu_percent(self, interval: float = 1.0) -> float: ...
    def get_ram_percent(self) -> float: ...
    def get_storage_info(self) -> StorageInfo: ...
    def get_tasks(self, limit: int = 50) -> List[TaskInfo]: ...


class IContainerRuntime(Protocol):
    """Outbound port for container orchestration (Docker/Podman)."""
    def list_containers(self, hidden_prefixes: Optional[List[str]] = None) -> List[ContainerInfo]: ...
    def execute_action(self, name: str, action: str, hidden_prefixes: Optional[List[str]] = None) -> ContainerActionResult: ...


class IMetricsRepository(Protocol):
    """Outbound port for persisting and querying historical telemetry."""
    def save_snapshot(
        self,
        cpu: float,
        ram: float,
        storage: float,
        storage_used: Optional[float] = None,
        storage_total: Optional[float] = None,
        containers_count: Optional[int] = None,
        running_containers: Optional[int] = None,
    ) -> None: ...

    def get_history(self, range_str: str = "24h", limit: int = 500) -> List[HistoricalMetricPoint]: ...
    def cleanup_old(self, retention_days: int) -> int: ...


class ILinuxAuthenticator(Protocol):
    """Outbound port for verifying host Linux credentials or SSH keys."""
    async def authenticate_password(self, username: str, password: str) -> Tuple[bool, str]: ...
    async def authenticate_ssh_key(self, username: str, key_content: str, passphrase: Optional[str] = None) -> Tuple[bool, str]: ...
