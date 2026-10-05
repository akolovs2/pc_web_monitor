from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, DateTime, Index
from app.models.database import Base

class MetricRecord(Base):
    __tablename__ = "metrics_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)
    cpu_percent = Column(Float, nullable=False)
    ram_percent = Column(Float, nullable=False)
    storage_percent = Column(Float, nullable=False)
    storage_used_gb = Column(Float, nullable=True)
    storage_total_gb = Column(Float, nullable=True)
    containers_count = Column(Integer, nullable=True)
    running_containers = Column(Integer, nullable=True)

    __table_args__ = (
        Index("ix_metrics_history_timestamp", "timestamp"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "cpu": self.cpu_percent,
            "ram": self.ram_percent,
            "storage": self.storage_percent,
            "storage_used": self.storage_used_gb,
            "storage_total": self.storage_total_gb,
            "containers_count": self.containers_count,
            "running_containers": self.running_containers,
        }
