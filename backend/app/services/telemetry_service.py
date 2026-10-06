"""Telemetry application service coordinating collectors, in-memory state, and persistence."""
import asyncio
from typing import Optional, Dict, Any, List
from app.domain.models import TelemetryState
from app.domain.ports import IHostCollector, IContainerRuntime, IMetricsRepository
from app.infrastructure.collectors.psutil_collector import PsutilHostCollector
from app.infrastructure.runtimes.docker_runtime import DockerRuntime
from app.infrastructure.db.sqlite_repository import SqliteMetricsRepository
from app.config import config


class TelemetryService:
    """Application service for system telemetry, metrics streaming, and historical persistence."""

    def __init__(
        self,
        host_collector: Optional[IHostCollector] = None,
        container_runtime: Optional[IContainerRuntime] = None,
        repository: Optional[IMetricsRepository] = None,
    ):
        self._collector = host_collector or PsutilHostCollector()
        self._runtime = container_runtime or DockerRuntime()
        self._repo = repository or SqliteMetricsRepository()
        self._state = TelemetryState()
        self._worker_task: Optional[asyncio.Task] = None
        self._running = False

    def get_current_metrics(self) -> Dict[str, Any]:
        """Returns the latest synchronized telemetry state."""
        return self._state.to_dict()

    async def update_tick(self, counter: int, loop: asyncio.AbstractEventLoop) -> None:
        """Executes a single telemetry update cycle without blocking the event loop."""
        if not self._state.hostname:
            self._state.hostname = await loop.run_in_executor(None, self._collector.get_hostname)

        # Collect CPU & RAM
        cpu = await loop.run_in_executor(None, self._collector.get_cpu_percent, config.METRICS_INTERVAL)
        ram = await loop.run_in_executor(None, self._collector.get_ram_percent)
        self._state.cpu = cpu
        self._state.ram = ram

        # Collect Storage
        storage_info = await loop.run_in_executor(None, self._collector.get_storage_info)
        self._state.storage = storage_info.percent
        self._state.storage_used = storage_info.used_gb
        self._state.storage_total = storage_info.total_gb

        # Tasks cycle (e.g. every 5s)
        if counter % config.TASKS_UPDATE_INTERVAL == 0:
            tasks = await loop.run_in_executor(None, self._collector.get_tasks, config.MAX_TASKS)
            self._state.tasks = [t.to_dict() for t in tasks]

        # Containers cycle (e.g. every 10s)
        if counter % config.CONTAINERS_UPDATE_INTERVAL == 0:
            containers = await loop.run_in_executor(
                None, self._runtime.list_containers, config.HIDDEN_CONTAINERS
            )
            self._state.containers = [c.to_dict() for c in containers]

        # Save snapshot (e.g. every 10s)
        if counter % config.METRICS_RECORD_INTERVAL == 0:
            running_count = sum(1 for c in self._state.containers if c.get("status") == "running")
            await loop.run_in_executor(
                None,
                self._repo.save_snapshot,
                self._state.cpu,
                self._state.ram,
                self._state.storage,
                self._state.storage_used,
                self._state.storage_total,
                len(self._state.containers),
                running_count,
            )

        # Hourly cleanup (> 14 days)
        if counter > 0 and counter % 3600 == 0:
            await loop.run_in_executor(None, self._repo.cleanup_old, config.METRICS_RETENTION_DAYS)

    async def _run_loop(self) -> None:
        counter = 0
        loop = asyncio.get_running_loop()
        while self._running:
            try:
                await self.update_tick(counter, loop)
            except Exception as e:
                print(f"[TelemetryService] Error in update loop: {e}")
            counter += 1
            await asyncio.sleep(1)

    def refresh_containers_now(self) -> None:
        """Immediately refreshes the container list in memory (e.g. after container action)."""
        try:
            containers = self._runtime.list_containers(config.HIDDEN_CONTAINERS)
            self._state.containers = [c.to_dict() for c in containers]
        except Exception as e:
            print(f"[TelemetryService] Error refreshing containers: {e}")

    def start_worker(self) -> None:
        """Starts the background telemetry ingestion worker."""
        if not self._running:
            self._running = True
            self._worker_task = asyncio.create_task(self._run_loop())

    def stop_worker(self) -> None:
        """Stops the background worker cleanly."""
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()

    async def get_history(self, range_str: str = "24h", limit: int = 2500) -> List[Dict[str, Any]]:
        """Queries historical telemetry from repository."""
        loop = asyncio.get_running_loop()
        records = await loop.run_in_executor(None, self._repo.get_history, range_str, limit)
        return [r.to_dict() for r in records]
