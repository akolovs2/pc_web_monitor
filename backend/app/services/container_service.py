"""Container application service orchestrating container lifecycle and domain rules."""
from typing import List, Dict, Any, Optional
from app.domain.ports import IContainerRuntime
from app.domain.models import ContainerActionResult
from app.infrastructure.runtimes.docker_runtime import DockerRuntime
from app.config import config

ALLOWED_ACTIONS = {"start", "stop", "restart", "remove", "delete"}


class ContainerService:
    """Application service for container management."""

    def __init__(
        self,
        runtime: Optional[IContainerRuntime] = None,
        hidden_prefixes: Optional[List[str]] = None,
    ):
        self._runtime = runtime or DockerRuntime()
        self._hidden_prefixes = hidden_prefixes if hidden_prefixes is not None else config.HIDDEN_CONTAINERS

    def list_containers(self) -> List[Dict[str, Any]]:
        containers = self._runtime.list_containers(self._hidden_prefixes)
        return [c.to_dict() for c in containers]

    def execute_action(self, name: str, action: str) -> ContainerActionResult:
        clean_name = name.strip()
        clean_action = action.strip().lower()

        if clean_action not in ALLOWED_ACTIONS:
            return ContainerActionResult(success=False, message=f"Invalid container action '{clean_action}'")

        if any(clean_name.startswith(p) for p in self._hidden_prefixes):
            return ContainerActionResult(success=False, message="Action not permitted on protected infrastructure container")

        return self._runtime.execute_action(clean_name, clean_action, self._hidden_prefixes)
