"""Pure domain data models and schemas (independent of framework and persistence)."""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any


@dataclass(frozen=True)
class StorageInfo:
    percent: float
    used_gb: float
    total_gb: float
    free_gb: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "percent": self.percent,
            "used_gb": self.used_gb,
            "total_gb": self.total_gb,
            "free_gb": self.free_gb,
        }


@dataclass(frozen=True)
class ContainerInfo:
    id: str
    name: str
    status: str
    image: str
    cpu: float
    memory: float
    memory_usage: int
    memory_limit: int
    created: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "image": self.image,
            "cpu": self.cpu,
            "memory": self.memory,
            "memory_usage": self.memory_usage,
            "memory_limit": self.memory_limit,
            "created": self.created,
        }


@dataclass(frozen=True)
class ContainerDetails:
    id: str
    name: str
    status: str
    image: str
    image_id: str
    created: str
    started_at: str
    finished_at: str
    restart_policy: str
    ports: List[Dict[str, Any]]
    env: List[str]
    volumes: List[Dict[str, Any]]
    command: Optional[str]
    memory_limit: int
    cpu_shares: int
    networks: List[str]
    ip_address: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "image": self.image,
            "image_id": self.image_id,
            "created": self.created,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "restart_policy": self.restart_policy,
            "ports": self.ports,
            "env": self.env,
            "volumes": self.volumes,
            "command": self.command,
            "memory_limit": self.memory_limit,
            "cpu_shares": self.cpu_shares,
            "networks": self.networks,
            "ip_address": self.ip_address,
        }


@dataclass(frozen=True)
class TaskInfo:
    pid: int
    name: str
    cpu: float
    memory: float
    status: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "pid": self.pid,
            "name": self.name,
            "cpu": self.cpu,
            "memory": self.memory,
            "status": self.status,
        }


@dataclass
class TelemetryState:
    hostname: str = ""
    cpu: float = 0.0
    ram: float = 0.0
    storage: float = 0.0
    storage_used: float = 0.0
    storage_total: float = 0.0
    containers: List[Dict[str, Any]] = field(default_factory=list)
    tasks: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hostname": self.hostname,
            "cpu": round(self.cpu, 1),
            "ram": round(self.ram, 1),
            "storage": round(self.storage, 1),
            "storage_used": round(self.storage_used, 1),
            "storage_total": round(self.storage_total, 1),
            "containers": self.containers,
            "tasks": self.tasks,
        }


@dataclass(frozen=True)
class HistoricalMetricPoint:
    timestamp: str
    cpu: float
    ram: float
    storage: float
    storage_used_gb: Optional[float] = None
    storage_total_gb: Optional[float] = None
    containers_count: Optional[int] = None
    running_containers: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "cpu": self.cpu,
            "ram": self.ram,
            "storage": self.storage,
            "storage_used_gb": self.storage_used_gb,
            "storage_total_gb": self.storage_total_gb,
            "containers_count": self.containers_count,
            "running_containers": self.running_containers,
        }


@dataclass(frozen=True)
class ContainerActionResult:
    success: bool
    message: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
        }
