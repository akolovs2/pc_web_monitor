"""SQLite telemetry repository adapter implementing IMetricsRepository."""
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from sqlalchemy import delete, select
from sqlalchemy.orm import sessionmaker
from app.domain.models import HistoricalMetricPoint
from app.domain.ports import IMetricsRepository
from app.models.database import SessionLocal
from app.models.metric_record import MetricRecord


def _parse_time_range(range_str: str) -> timedelta:
    s = range_str.lower().strip()
    if s.endswith("h"):
        return timedelta(hours=int(s[:-1]))
    if s.endswith("d"):
        return timedelta(days=int(s[:-1]))
    if s.endswith("m"):
        return timedelta(minutes=int(s[:-1]))
    return timedelta(hours=24)


class SqliteMetricsRepository(IMetricsRepository):
    """Concrete SQLAlchemy SQLite repository for metric snapshots."""

    def __init__(self, session_factory: sessionmaker = SessionLocal):
        self._session_factory = session_factory

    def save_snapshot(
        self,
        cpu: float,
        ram: float,
        storage: float,
        storage_used: Optional[float] = None,
        storage_total: Optional[float] = None,
        containers_count: Optional[int] = None,
        running_containers: Optional[int] = None,
    ) -> None:
        session = self._session_factory()
        try:
            record = MetricRecord(
                timestamp=datetime.now(timezone.utc),
                cpu_percent=round(float(cpu), 2),
                ram_percent=round(float(ram), 2),
                storage_percent=round(float(storage), 2),
                storage_used_gb=round(float(storage_used), 2) if storage_used is not None else None,
                storage_total_gb=round(float(storage_total), 2) if storage_total is not None else None,
                containers_count=containers_count,
                running_containers=running_containers,
            )
            session.add(record)
            session.commit()
        except Exception as e:
            session.rollback()
            print(f"[SqliteMetricsRepository] Error saving snapshot: {e}")
        finally:
            session.close()

    def get_history(self, range_str: str = "24h", limit: int = 500) -> List[HistoricalMetricPoint]:
        delta = _parse_time_range(range_str)
        since = datetime.now(timezone.utc) - delta

        session = self._session_factory()
        try:
            stmt = (
                select(MetricRecord)
                .where(MetricRecord.timestamp >= since)
                .order_by(MetricRecord.timestamp.asc())
            )
            records = session.scalars(stmt).all()
            if not records:
                return []

            # Downsample if record count exceeds target limit
            total = len(records)
            if total > limit and limit > 0:
                step = total / limit
                sampled_indices = [int(i * step) for i in range(limit)]
                if (total - 1) not in sampled_indices:
                    sampled_indices[-1] = total - 1
                records = [records[i] for i in sampled_indices]

            return [
                HistoricalMetricPoint(
                    timestamp=r.timestamp.isoformat() if r.timestamp else "",
                    cpu=r.cpu_percent,
                    ram=r.ram_percent,
                    storage=r.storage_percent,
                    storage_used_gb=r.storage_used_gb,
                    storage_total_gb=r.storage_total_gb,
                    containers_count=r.containers_count,
                    running_containers=r.running_containers,
                )
                for r in records
            ]
        except Exception as e:
            print(f"[SqliteMetricsRepository] Error fetching history: {e}")
            return []
        finally:
            session.close()

    def cleanup_old(self, retention_days: int) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        session = self._session_factory()
        deleted_count = 0
        try:
            stmt = delete(MetricRecord).where(MetricRecord.timestamp < cutoff)
            result = session.execute(stmt)
            session.commit()
            deleted_count = result.rowcount
            if deleted_count > 0:
                print(f"[SqliteMetricsRepository] Purged {deleted_count} records older than {retention_days} days")
        except Exception as e:
            session.rollback()
            print(f"[SqliteMetricsRepository] Cleanup error: {e}")
        finally:
            session.close()
        return deleted_count
