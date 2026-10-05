from typing import List, Optional, Dict, Any
import docker
from app.domain.models import ContainerInfo, ContainerDetails, ContainerActionResult
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

    def inspect_container(self, name: str) -> Optional[ContainerDetails]:
        if not self._client:
            return None
        try:
            c = self._client.containers.get(name)
            attrs = c.attrs or {}
            config = attrs.get("Config", {}) or {}
            host_config = attrs.get("HostConfig", {}) or {}
            state = attrs.get("State", {}) or {}
            net_settings = attrs.get("NetworkSettings", {}) or {}

            # Parse ports
            port_bindings = host_config.get("PortBindings") or {}
            ports: List[Dict[str, Any]] = []
            for container_port_proto, host_bindings in port_bindings.items():
                proto = "tcp"
                c_port = container_port_proto
                if "/" in container_port_proto:
                    c_port, proto = container_port_proto.split("/", 1)

                if host_bindings:
                    for binding in host_bindings:
                        ports.append({
                            "container_port": c_port,
                            "protocol": proto,
                            "host_port": binding.get("HostPort", ""),
                            "host_ip": binding.get("HostIp", ""),
                        })
                else:
                    ports.append({
                        "container_port": c_port,
                        "protocol": proto,
                        "host_port": "",
                        "host_ip": "",
                    })

            # Parse volumes / mounts
            binds = host_config.get("Binds") or []
            mounts: List[Dict[str, Any]] = []
            for b in binds:
                parts = b.split(":")
                if len(parts) >= 2:
                    mounts.append({
                        "host_path": parts[0],
                        "container_path": parts[1],
                        "mode": parts[2] if len(parts) > 2 else "rw",
                    })

            if not mounts and attrs.get("Mounts"):
                for m in attrs.get("Mounts", []):
                    mounts.append({
                        "host_path": m.get("Source", ""),
                        "container_path": m.get("Destination", ""),
                        "mode": m.get("Mode", "rw"),
                    })

            # Restart policy
            rp_raw = host_config.get("RestartPolicy", {}) or {}
            rp_name = rp_raw.get("Name") or "no"

            # Networks & IP
            networks = list(net_settings.get("Networks", {}).keys())
            ip_address = net_settings.get("IPAddress", "")
            if not ip_address and networks:
                first_net = net_settings.get("Networks", {}).get(networks[0], {})
                ip_address = first_net.get("IPAddress", "")

            # Command
            cmd = config.get("Cmd")
            command_str = " ".join(cmd) if isinstance(cmd, list) else (str(cmd) if cmd else None)

            # Image
            image_tag = c.image.tags[0] if (c.image and c.image.tags) else config.get("Image", "unknown")
            image_id = attrs.get("Image", "")[:12]

            return ContainerDetails(
                id=c.short_id,
                name=c.name,
                status=state.get("Status", c.status),
                image=image_tag,
                image_id=image_id,
                created=attrs.get("Created", ""),
                started_at=state.get("StartedAt", ""),
                finished_at=state.get("FinishedAt", ""),
                restart_policy=rp_name,
                ports=ports,
                env=config.get("Env", []) or [],
                volumes=mounts,
                command=command_str,
                memory_limit=host_config.get("Memory", 0),
                cpu_shares=host_config.get("CpuShares", 0),
                networks=networks,
                ip_address=ip_address,
            )
        except Exception as e:
            print(f"[DockerRuntime] Error inspecting container '{name}': {e}")
            return None

    def update_container(
        self,
        name: str,
        restart_policy: Optional[str] = None,
        mem_limit: Optional[int] = None,
        cpu_shares: Optional[int] = None,
    ) -> ContainerActionResult:
        if not self._client:
            return ContainerActionResult(success=False, message="Docker daemon unavailable")
        try:
            c = self._client.containers.get(name)
            kwargs = {}
            if restart_policy:
                kwargs["restart_policy"] = {"Name": restart_policy}
            if mem_limit is not None and mem_limit > 0:
                kwargs["mem_limit"] = mem_limit
            if cpu_shares is not None and cpu_shares > 0:
                kwargs["cpu_shares"] = cpu_shares

            if kwargs:
                c.update(**kwargs)
                return ContainerActionResult(success=True, message=f"Container '{name}' updated successfully")
            return ContainerActionResult(success=True, message="No changes specified")
        except docker.errors.NotFound:
            return ContainerActionResult(success=False, message=f"Container '{name}' not found")
        except docker.errors.APIError as e:
            msg = getattr(e, "explanation", str(e)) or str(e)
            return ContainerActionResult(success=False, message=msg)
        except Exception as e:
            return ContainerActionResult(success=False, message=f"Update failed: {str(e)}")

    def rename_container(self, name: str, new_name: str) -> ContainerActionResult:
        if not self._client:
            return ContainerActionResult(success=False, message="Docker daemon unavailable")
        clean_new_name = new_name.strip()
        if not clean_new_name:
            return ContainerActionResult(success=False, message="New name cannot be empty")
        try:
            c = self._client.containers.get(name)
            c.rename(clean_new_name)
            return ContainerActionResult(success=True, message=f"Container renamed to '{clean_new_name}'")
        except docker.errors.NotFound:
            return ContainerActionResult(success=False, message=f"Container '{name}' not found")
        except docker.errors.APIError as e:
            msg = getattr(e, "explanation", str(e)) or str(e)
            return ContainerActionResult(success=False, message=msg)
        except Exception as e:
            return ContainerActionResult(success=False, message=f"Rename failed: {str(e)}")
