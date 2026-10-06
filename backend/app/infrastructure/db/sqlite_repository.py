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

    # Partition records into `limit` time buckets, preserving peak values in each bucket
    bucket_size = total / limit
    downsampled: List[HistoricalMetricPoint] = []

    for i in range(limit):
        start_idx = int(i * bucket_size)
        end_idx = int((i + 1) * bucket_size) if i < limit - 1 else total
        chunk = records[start_idx:end_idx]
        if not chunk:
            continue

        # Find the record with the highest peak activity in this bucket
        peak_record = max(chunk, key=lambda r: (r.cpu_percent, r.ram_percent))

        peak_cpu = max(r.cpu_percent for r in chunk)
        peak_ram = max(r.ram_percent for r in chunk)
        peak_storage = max(r.storage_percent for r in chunk)
        peak_storage_used = max((r.storage_used_gb or 0.0) for r in chunk)
        storage_total = chunk[-1].storage_total_gb
        peak_containers = max((r.containers_count or 0) for r in chunk)
        peak_running = max((r.running_containers or 0) for r in chunk)

        # Preserve the exact peak timestamp so hover and tooltips match 1h perfectly
        if i == limit - 1:
            ts = chunk[-1].timestamp
        elif peak_cpu > 5.0 or peak_ram > 5.0:
            ts = peak_record.timestamp
        else:
            ts = chunk[len(chunk) // 2].timestamp

        downsampled.append(
            HistoricalMetricPoint(
                timestamp=_format_timestamp(ts),
                cpu=round(peak_cpu, 2),
                ram=round(peak_ram, 2),
                storage=round(peak_storage, 2),
                storage_used_gb=round(peak_storage_used, 2) if peak_storage_used > 0 else None,
                storage_total_gb=storage_total,
                containers_count=peak_containers,
                running_containers=peak_running,
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

    def get_history(self, range_str: str = "24h", limit: int = 2500) -> List[HistoricalMetricPoint]:
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
