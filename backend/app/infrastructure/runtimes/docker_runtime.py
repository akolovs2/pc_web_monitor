"""Container runtime adapter implementing IContainerRuntime via Docker SDK."""
from typing import List, Optional
import docker
from app.domain.models import ContainerInfo, ContainerActionResult
from app.domain.ports import IContainerRuntime


class DockerRuntime(IContainerRuntime):
    """Concrete container runtime adapter interacting with the local Docker daemon."""

    def __init__(self, client: Optional[docker.DockerClient] = None):
        try:
            self._client = client or docker.from_env()
        except Exception as e:
            self._client = None
            print(f"[DockerRuntime] Warning: Failed to connect to Docker daemon: {e}")

    def list_containers(self, hidden_prefixes: Optional[List[str]] = None) -> List[ContainerInfo]:
        if not self._client:
            return []

        prefixes = hidden_prefixes or []
        containers: List[ContainerInfo] = []

        try:
            raw_containers = self._client.containers.list(all=True)
            for c in raw_containers:
                if any(c.name.startswith(p) for p in prefixes):
                    continue

                cpu_percent = 0.0
                mem_percent = 0.0
                mem_usage = 0
                mem_limit = 0

                if c.status == "running":
                    try:
                        stats = c.stats(stream=False)
                        cpu_stats = stats.get("cpu_stats", {})
                        precpu_stats = stats.get("precpu_stats", {})
                        cpu_delta = cpu_stats.get("cpu_usage", {}).get("total_usage", 0) - \
                                    precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
                        system_delta = cpu_stats.get("system_cpu_usage", 0) - \
                                       precpu_stats.get("system_cpu_usage", 0)

                        if system_delta > 0:
                            cpu_percent = round((cpu_delta / system_delta) * 100, 2)

                        mem_stats = stats.get("memory_stats", {})
                        mem_usage = mem_stats.get("usage", 0)
                        mem_limit = mem_stats.get("limit", 0)
                        if mem_limit > 0:
                            mem_percent = round((mem_usage / mem_limit) * 100, 2)
                    except (KeyError, TypeError, Exception):
                        pass

                tag = c.image.tags[0] if c.image.tags else "unknown"
                containers.append(
                    ContainerInfo(
                        id=c.short_id,
                        name=c.name,
                        status=c.status,
                        image=tag,
                        cpu=cpu_percent,
                        memory=mem_percent,
                        memory_usage=mem_usage,
                        memory_limit=mem_limit,
                    )
                )
            return containers
        except Exception as e:
            print(f"[DockerRuntime] Error listing containers: {e}")
            return []

    def execute_action(
        self,
        name: str,
        action: str,
        hidden_prefixes: Optional[List[str]] = None
    ) -> ContainerActionResult:
        if not self._client:
            return ContainerActionResult(success=False, message="Docker daemon unavailable")

        prefixes = hidden_prefixes or []
        if any(name.startswith(p) for p in prefixes):
            return ContainerActionResult(success=False, message="Action not permitted on protected container")

        try:
            container = self._client.containers.get(name)
            if action in ["remove", "delete"]:
                container.remove(force=True)
                return ContainerActionResult(success=True, message="Container deleted successfully")

            if hasattr(container, action):
                getattr(container, action)()
                return ContainerActionResult(success=True, message=f"{action.capitalize()} completed successfully")
            return ContainerActionResult(success=False, message=f"Unsupported container action '{action}'")

        except docker.errors.NotFound:
            return ContainerActionResult(success=False, message=f"Container '{name}' not found")
        except docker.errors.APIError as e:
            if e.status_code == 304:
                return ContainerActionResult(success=True, message=f"Container already in requested state ({action})")
            msg = getattr(e, "explanation", str(e)) or str(e)
            return ContainerActionResult(success=False, message=msg)
        except Exception as e:
            return ContainerActionResult(success=False, message=f"Unexpected error: {str(e)}")

    def create_container(
        self,
        image: str,
        name: Optional[str] = None,
        ports: Optional[dict] = None,
        environment: Optional[dict] = None,
        volumes: Optional[dict] = None,
        restart_policy: str = "unless-stopped",
        command: Optional[str] = None,
    ) -> ContainerActionResult:
        if not self._client:
            return ContainerActionResult(success=False, message="Docker daemon unavailable")

        clean_image = image.strip()
        if not clean_image:
            return ContainerActionResult(success=False, message="Image name is required")

        clean_name = name.strip() if name and name.strip() else None

        rp_dict = {"Name": restart_policy} if restart_policy and restart_policy != "no" else None

        try:
            container = self._client.containers.run(
                image=clean_image,
                name=clean_name,
                ports=ports,
                environment=environment,
                volumes=volumes,
                restart_policy=rp_dict,
                command=command if command and command.strip() else None,
                detach=True,
            )
            return ContainerActionResult(
                success=True,
                message=f"Container '{container.name}' deployed successfully from {clean_image}",
            )
        except docker.errors.ImageNotFound:
            return ContainerActionResult(success=False, message=f"Image '{clean_image}' not found on Docker Hub")
        except docker.errors.APIError as e:
            msg = getattr(e, "explanation", str(e)) or str(e)
            return ContainerActionResult(success=False, message=msg)
        except Exception as e:
            return ContainerActionResult(success=False, message=f"Failed to deploy container: {str(e)}")
