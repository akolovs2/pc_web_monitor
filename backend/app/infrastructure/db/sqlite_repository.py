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


def _format_timestamp(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    s = dt.isoformat()
    if not s.endswith("Z") and "+" not in s:
        s += "Z"
    return s


def _despike_records(records: List[MetricRecord], threshold: float = 0.8) -> List[MetricRecord]:
    """Filters out transient 1-2 sample impulse noise spikes from CPU telemetry while strictly preserving sustained workloads."""
    n = len(records)
    if n <= 3:
        return records

    cleaned = list(records)
    i = 1
    while i < n - 1:
        prev_cpu = cleaned[i - 1].cpu_percent
        curr_cpu = cleaned[i].cpu_percent
        next_cpu = records[i + 1].cpu_percent

        # Case 1: isolated 1-sample spike jumping above both neighbors
        baseline1 = (prev_cpu + next_cpu) / 2
        if curr_cpu > baseline1 + threshold and curr_cpu > prev_cpu * 1.5 and curr_cpu > next_cpu * 1.5:
            r = cleaned[i]
            cleaned[i] = MetricRecord(
                id=r.id,
                timestamp=r.timestamp,
                cpu_percent=round(baseline1, 2),
                ram_percent=r.ram_percent,
                storage_percent=r.storage_percent,
                storage_used_gb=r.storage_used_gb,
                storage_total_gb=r.storage_total_gb,
                containers_count=r.containers_count,
                running_containers=r.running_containers,
            )
            i += 1
            continue

        # Case 2: isolated 2-sample spike with lower neighbors on both sides
        if i < n - 2:
            after_cpu = records[i + 2].cpu_percent
            baseline2 = (prev_cpu + after_cpu) / 2
            if (curr_cpu > baseline2 + threshold and next_cpu > baseline2 + threshold and
                curr_cpu > prev_cpu * 1.5 and next_cpu > after_cpu * 1.5):
                for idx in (i, i + 1):
                    r = cleaned[idx]
                    cleaned[idx] = MetricRecord(
                        id=r.id,
                        timestamp=r.timestamp,
                        cpu_percent=round(baseline2, 2),
                        ram_percent=r.ram_percent,
                        storage_percent=r.storage_percent,
                        storage_used_gb=r.storage_used_gb,
                        storage_total_gb=r.storage_total_gb,
                        containers_count=r.containers_count,
                        running_containers=r.running_containers,
                    )
                i += 2
                continue

        i += 1
    return cleaned


def _downsample_records(records: List[MetricRecord], limit: int) -> List[HistoricalMetricPoint]:
    total = len(records)
    if total <= limit or limit <= 0:
        return [
            HistoricalMetricPoint(
                timestamp=_format_timestamp(r.timestamp),
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

    # Partition records into `limit` time buckets
    bucket_size = total / limit
    downsampled: List[HistoricalMetricPoint] = []

    for i in range(limit):
        start_idx = int(i * bucket_size)
        end_idx = int((i + 1) * bucket_size) if i < limit - 1 else total
        chunk = records[start_idx:end_idx]
        if not chunk:
            continue

        chunk_len = len(chunk)
        avg_cpu = sum(r.cpu_percent for r in chunk) / chunk_len
        avg_ram = sum(r.ram_percent for r in chunk) / chunk_len
        avg_storage = sum(r.storage_percent for r in chunk) / chunk_len

        valid_storage_used = [r.storage_used_gb for r in chunk if r.storage_used_gb is not None]
        avg_storage_used = sum(valid_storage_used) / len(valid_storage_used) if valid_storage_used else None
        storage_total = chunk[-1].storage_total_gb

        # Detect container restarts / crash loops / lifecycle changes
        running_vals = [r.running_containers for r in chunk if r.running_containers is not None]
        container_vals = [r.containers_count for r in chunk if r.containers_count is not None]
        has_container_event = (
            (len(running_vals) > 0 and max(running_vals) != min(running_vals)) or
            (len(container_vals) > 0 and max(container_vals) != min(container_vals))
        )

        ts = chunk[-1].timestamp if i == limit - 1 else chunk[chunk_len // 2].timestamp
        val_cpu = round(avg_cpu, 2)
        val_ram = round(avg_ram, 2)
        val_storage = round(avg_storage, 2)
        val_containers = chunk[-1].containers_count
        val_running = chunk[-1].running_containers

        # If a container lifecycle event occurred, anchor to the exact event
        if has_container_event:
            event_rec = next((r for r in chunk if r.running_containers != chunk[0].running_containers), chunk[-1])
            ts = event_rec.timestamp
            val_containers = event_rec.containers_count
            val_running = event_rec.running_containers

        downsampled.append(
            HistoricalMetricPoint(
                timestamp=_format_timestamp(ts),
                cpu=val_cpu,
                ram=val_ram,
                storage=val_storage,
                storage_used_gb=round(avg_storage_used, 2) if avg_storage_used is not None else None,
                storage_total_gb=storage_total,
                containers_count=val_containers,
                running_containers=val_running,
            )
        )

    # Ensure strictly sorted by timestamp
    downsampled.sort(key=lambda p: p.timestamp)
    return downsampled


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

    def get_history(self, range_str: str = "24h", limit: int = 1000) -> List[HistoricalMetricPoint]:
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

            # Despike telemetry to eliminate 1-2 sample impulse blips
            despiked = _despike_records(records)

            # 1h (~360 records) is kept raw; longer ranges (6h, 24h, 7d, 14d) are downsampled
            clean_range = range_str.lower().strip()
            if clean_range == "1h" or len(records) <= limit:
                return [
                    HistoricalMetricPoint(
                        timestamp=_format_timestamp(r.timestamp),
                        cpu=r.cpu_percent,
                        ram=r.ram_percent,
                        storage=r.storage_percent,
                        storage_used_gb=r.storage_used_gb,
                        storage_total_gb=r.storage_total_gb,
                        containers_count=r.containers_count,
                        running_containers=r.running_containers,
                    )
                    for r in despiked
                ]

            return _downsample_records(despiked, limit)
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
