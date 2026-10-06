"""Backward compatibility wrapper delegating to SqliteMetricsRepository."""
from typing import Optional, List, Dict, Any
from app.infrastructure.db.sqlite_repository import SqliteMetricsRepository
from app.config import config

_repo = SqliteMetricsRepository()


def record_metric_snapshot(
    cpu: float,
    ram: float,
    storage: float,
    storage_used: Optional[float] = None,
    storage_total: Optional[float] = None,
    containers_count: Optional[int] = None,
    running_containers: Optional[int] = None,
) -> None:
    _repo.save_snapshot(
        cpu=cpu,
        ram=ram,
        storage=storage,
        storage_used=storage_used,
        storage_total=storage_total,
        containers_count=containers_count,
        running_containers=running_containers,
    )


def cleanup_old_metrics(retention_days: Optional[int] = None) -> int:
    days = retention_days if retention_days is not None else config.METRICS_RETENTION_DAYS
    return _repo.cleanup_old(days)


def get_metrics_history(range_str: str = "24h", limit: int = 2500) -> List[Dict[str, Any]]:
    points = _repo.get_history(range_str, limit)
    return [p.to_dict() for p in points]
