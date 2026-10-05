from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import delete, select
from app.models.database import SessionLocal
from app.models.metric_record import MetricRecord
from app.config import config

def record_metric_snapshot(
    cpu: float,
    ram: float,
    storage: float,
    storage_used: Optional[float] = None,
    storage_total: Optional[float] = None,
    containers_count: Optional[int] = None,
    running_containers: Optional[int] = None,
) -> None:
    """Inserts a single metric snapshot into the SQLite database."""
    session = SessionLocal()
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
        print(f"[MetricsRecorder] Error saving snapshot: {e}")
    finally:
        session.close()

def cleanup_old_metrics(retention_days: Optional[int] = None) -> int:
    """Deletes metric records older than retention_days (default from config: 14 days)."""
    days = retention_days if retention_days is not None else config.METRICS_RETENTION_DAYS
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    session = SessionLocal()
    deleted_count = 0
    try:
        stmt = delete(MetricRecord).where(MetricRecord.timestamp < cutoff)
        result = session.execute(stmt)
        session.commit()
        deleted_count = result.rowcount
        if deleted_count > 0:
            print(f"[MetricsRecorder] Cleaned up {deleted_count} records older than {days} days")
    except Exception as e:
        session.rollback()
        print(f"[MetricsRecorder] Error cleaning up old metrics: {e}")
    finally:
        session.close()
    return deleted_count

def parse_time_range(range_str: str) -> timedelta:
    """Parses range strings like '1h', '6h', '24h', '7d', '14d' into timedelta."""
    range_str = range_str.lower().strip()
    if range_str.endswith("h"):
        hours = int(range_str[:-1])
        return timedelta(hours=hours)
    if range_str.endswith("d"):
        days = int(range_str[:-1])
        return timedelta(days=days)
    if range_str.endswith("m"):
        minutes = int(range_str[:-1])
        return timedelta(minutes=minutes)
    return timedelta(hours=24)

def get_metrics_history(range_str: str = "24h", limit: int = 500) -> list[dict]:
    """
    Fetches historical metrics for the specified time range.
    Downsamples to at most `limit` items to ensure fast JSON delivery and chart performance.
    """
    delta = parse_time_range(range_str)
    since = datetime.now(timezone.utc) - delta

    session = SessionLocal()
    try:
        stmt = (
            select(MetricRecord)
            .where(MetricRecord.timestamp >= since)
            .order_by(MetricRecord.timestamp.asc())
        )
        records = session.scalars(stmt).all()
        if not records:
            return []

        # Downsample if record count exceeds limit
        total = len(records)
        if total > limit and limit > 0:
            step = total / limit
            sampled_indices = [int(i * step) for i in range(limit)]
            # Ensure the latest record is always included
            if (total - 1) not in sampled_indices:
                sampled_indices[-1] = total - 1
            records = [records[i] for i in sampled_indices]

        return [r.to_dict() for r in records]
    except Exception as e:
        print(f"[MetricsRecorder] Error fetching history: {e}")
        return []
    finally:
        session.close()
