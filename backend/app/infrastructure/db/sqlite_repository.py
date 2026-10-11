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

        peak_cpu_rec = max(chunk, key=lambda r: r.cpu_percent)
        peak_ram_rec = max(chunk, key=lambda r: r.ram_percent)

        max_cpu = peak_cpu_rec.cpu_percent
        max_ram = peak_ram_rec.ram_percent

        # Peak detection:
        # A significant transient CPU spike is noticeably above baseline (> 3.0% and > 1.8x average, or >= 5.0%)
        is_cpu_spike = (max_cpu >= 3.0 and max_cpu >= 1.8 * (avg_cpu or 0.1)) or (max_cpu >= 5.0)
        is_ram_spike = (max_ram - avg_ram >= 3.0)

        # Detect container restarts / crash loops / lifecycle changes
        running_vals = [r.running_containers for r in chunk if r.running_containers is not None]
        container_vals = [r.containers_count for r in chunk if r.containers_count is not None]
        has_container_event = (
            (len(running_vals) > 0 and max(running_vals) != min(running_vals)) or
            (len(container_vals) > 0 and max(container_vals) != min(container_vals))
        )

        if is_cpu_spike or is_ram_spike:
            # Anchor to peak event timestamp so hover/tooltip matches the exact moment of the spike
            peak_rec = peak_cpu_rec if (max_cpu / (avg_cpu or 0.1) >= max_ram / (avg_ram or 0.1)) else peak_ram_rec
            ts = peak_rec.timestamp
            val_cpu = round(max_cpu, 2) if is_cpu_spike else round(avg_cpu, 2)
            val_ram = round(max_ram, 2) if is_ram_spike else round(avg_ram, 2)
            val_storage = round(avg_storage, 2)
            val_containers = peak_rec.containers_count if peak_rec.containers_count is not None else chunk[-1].containers_count
            val_running = peak_rec.running_containers if peak_rec.running_containers is not None else chunk[-1].running_containers
        elif has_container_event:
            # Lifecycle event occurred: preserve event point
            event_rec = next((r for r in chunk if r.running_containers != chunk[0].running_containers), chunk[-1])
            ts = event_rec.timestamp
            val_cpu = round(avg_cpu, 2)
            val_ram = round(avg_ram, 2)
            val_storage = round(avg_storage, 2)
            val_containers = event_rec.containers_count
            val_running = event_rec.running_containers
        else:
            # Steady baseline / idle noise: use bucket average and center timestamp
            ts = chunk[-1].timestamp if i == limit - 1 else chunk[chunk_len // 2].timestamp
            val_cpu = round(avg_cpu, 2)
            val_ram = round(avg_ram, 2)
            val_storage = round(avg_storage, 2)
            val_containers = chunk[-1].containers_count
            val_running = chunk[-1].running_containers

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

            # 1h (~360 records) and 6h (~2160 records) are kept raw without downsampling
            # so that no data points or spikes are ever lost.
            clean_range = range_str.lower().strip()
            if clean_range in ("1h", "6h") or len(records) <= limit:
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

            return _downsample_records(records, limit)
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
