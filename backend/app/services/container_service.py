"""Container application service orchestrating container lifecycle and domain rules."""
from typing import List, Dict, Any, Optional, Union
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

    def deploy_container(
        self,
        image: str,
        name: Optional[str] = None,
        ports: Optional[Union[List[str], Dict[str, Any]]] = None,
        env: Optional[Union[List[str], Dict[str, str]]] = None,
        volumes: Optional[Union[List[str], Dict[str, Any]]] = None,
        restart_policy: str = "unless-stopped",
        command: Optional[str] = None,
    ) -> ContainerActionResult:
        clean_image = image.strip() if image else ""
        if not clean_image:
            return ContainerActionResult(success=False, message="Image name from Docker Hub is required")

        clean_name = name.strip() if name and name.strip() else None
        if clean_name and any(clean_name.startswith(p) for p in self._hidden_prefixes):
            return ContainerActionResult(success=False, message="Cannot use protected prefix for container name")

        # Parse ports: ["8080:80", "8443:443/tcp"] -> {"80/tcp": 8080}
        parsed_ports = {}
        if isinstance(ports, list):
            for p in ports:
                p_str = p.strip()
                if not p_str or ":" not in p_str:
                    continue
                parts = p_str.split(":")
                if len(parts) == 2:
                    host_p, container_p = parts[0].strip(), parts[1].strip()
                    ckey = container_p if "/" in container_p else f"{container_p}/tcp"
                    try:
                        parsed_ports[ckey] = int(host_p)
                    except ValueError:
                        parsed_ports[ckey] = host_p
        elif isinstance(ports, dict):
            parsed_ports = ports

        # Parse environment variables: ["KEY=VAL"] -> {"KEY": "VAL"}
        parsed_env = {}
        if isinstance(env, list):
            for e in env:
                e_str = e.strip()
                if not e_str:
                    continue
                if "=" in e_str:
                    k, v = e_str.split("=", 1)
                    parsed_env[k.strip()] = v.strip()
                else:
                    parsed_env[e_str] = ""
        elif isinstance(env, dict):
            parsed_env = env

        # Parse volumes: ["/host/path:/container/path:rw"] -> {"/host/path": {"bind": "/container/path", "mode": "rw"}}
        parsed_volumes = {}
        if isinstance(volumes, list):
            for v in volumes:
                v_str = v.strip()
                if not v_str or ":" not in v_str:
                    continue
                parts = v_str.split(":")
                host_path = parts[0].strip()
                container_path = parts[1].strip()
                mode = parts[2].strip() if len(parts) > 2 else "rw"
                parsed_volumes[host_path] = {"bind": container_path, "mode": mode}
        elif isinstance(volumes, dict):
            parsed_volumes = volumes

        return self._runtime.create_container(
            image=clean_image,
            name=clean_name,
            ports=parsed_ports if parsed_ports else None,
            environment=parsed_env if parsed_env else None,
            volumes=parsed_volumes if parsed_volumes else None,
            restart_policy=restart_policy,
            command=command,
        )
