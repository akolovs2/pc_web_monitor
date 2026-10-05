"""Backward compatibility wrapper delegating to PsutilHostCollector and DockerRuntime."""
from typing import List, Dict, Any
from app.infrastructure.collectors.psutil_collector import PsutilHostCollector
from app.infrastructure.runtimes.docker_runtime import DockerRuntime
from app.config import config

_collector = PsutilHostCollector()
_runtime = DockerRuntime()


def get_cpu_percent() -> float:
    return _collector.get_cpu_percent(config.METRICS_INTERVAL)


def get_ram_percent() -> float:
    return _collector.get_ram_percent()


def get_storage_info() -> Dict[str, Any]:
    return _collector.get_storage_info().to_dict()


def get_tasks() -> List[Dict[str, Any]]:
    return [t.to_dict() for t in _collector.get_tasks(config.MAX_TASKS)]


def get_containers() -> List[Dict[str, Any]]:
    return [c.to_dict() for c in _runtime.list_containers(config.HIDDEN_CONTAINERS)]


def get_hostname() -> str:
    return _collector.get_hostname()