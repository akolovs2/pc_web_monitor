from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from app.services.container_service import ContainerService
from app.services.telemetry_service import TelemetryService
from app.dependencies import get_container_service, get_telemetry_service

router = APIRouter(prefix="/docker", tags=["Containers"])


class CreateContainerRequest(BaseModel):
    image: str = Field(..., description="Docker Hub image name, e.g. 'nginx:alpine', 'redis:latest'")
    name: Optional[str] = Field(None, description="Custom container name")
    ports: Optional[List[str]] = Field(None, description="Port mappings, e.g. ['8080:80']")
    env: Optional[List[str]] = Field(None, description="Environment variables, e.g. ['POSTGRES_PASSWORD=secret']")
    volumes: Optional[List[str]] = Field(None, description="Volume mounts, e.g. ['/host/path:/container/path']")
    restart_policy: str = Field("unless-stopped", description="Restart policy: unless-stopped, always, on-failure, no")
    command: Optional[str] = Field(None, description="Optional command or arguments")


class UpdateContainerRequest(BaseModel):
    restart_policy: Optional[str] = Field(None, description="Restart policy: unless-stopped, always, on-failure, no")
    mem_limit: Optional[int] = Field(None, description="Memory limit in bytes")
    cpu_shares: Optional[int] = Field(None, description="CPU shares")
    new_name: Optional[str] = Field(None, description="New container name")


class RecreateContainerRequest(BaseModel):
    image: str = Field(..., description="Docker Hub image name, e.g. 'nginx:alpine'")
    new_name: Optional[str] = Field(None, description="Updated container name")
    ports: Optional[List[str]] = Field(None, description="Updated port mappings, e.g. ['8080:80']")
    env: Optional[List[str]] = Field(None, description="Updated environment variables")
    volumes: Optional[List[str]] = Field(None, description="Updated volume mounts")
    restart_policy: str = Field("unless-stopped", description="Updated restart policy")
    command: Optional[str] = Field(None, description="Updated command")


@router.post("/containers/create")
@router.post("/containers")
def create_container(
    req: CreateContainerRequest,
    service: ContainerService = Depends(get_container_service),
    telemetry_svc: TelemetryService = Depends(get_telemetry_service),
):
    result = service.deploy_container(
        image=req.image,
        name=req.name,
        ports=req.ports,
        env=req.env,
        volumes=req.volumes,
        restart_policy=req.restart_policy,
        command=req.command,
    )
    if result.success:
        telemetry_svc.refresh_containers_now()
    return result.to_dict()


@router.get("/containers/{name}")
@router.get("/containers/{name}/inspect")
def get_container(
    name: str,
    service: ContainerService = Depends(get_container_service),
):
    details = service.inspect_container(name)
    if not details:
        raise HTTPException(status_code=404, detail=f"Container '{name}' not found")
    return details


@router.post("/containers/{name}/update")
@router.patch("/containers/{name}")
def update_container(
    name: str,
    req: UpdateContainerRequest,
    service: ContainerService = Depends(get_container_service),
    telemetry_svc: TelemetryService = Depends(get_telemetry_service),
):
    target_name = name
    if req.new_name and req.new_name.strip() and req.new_name.strip() != name:
        rename_res = service.rename_container(name, req.new_name.strip())
        if not rename_res.success:
            return rename_res.to_dict()
        target_name = req.new_name.strip()

    result = service.update_container(
        name=target_name,
        restart_policy=req.restart_policy,
        mem_limit=req.mem_limit,
        cpu_shares=req.cpu_shares,
    )
    telemetry_svc.refresh_containers_now()
    return result.to_dict()


@router.post("/containers/{name}/recreate")
def recreate_container(
    name: str,
    req: RecreateContainerRequest,
    service: ContainerService = Depends(get_container_service),
    telemetry_svc: TelemetryService = Depends(get_telemetry_service),
):
    result = service.recreate_container(
        name=name,
        image=req.image,
        new_name=req.new_name,
        ports=req.ports,
        env=req.env,
        volumes=req.volumes,
        restart_policy=req.restart_policy,
        command=req.command,
    )
    telemetry_svc.refresh_containers_now()
    return result.to_dict()


@router.post("/containers/{name}/{action}")
def control_container(
    name: str,
    action: str,
    service: ContainerService = Depends(get_container_service),
    telemetry_svc: TelemetryService = Depends(get_telemetry_service),
):
    result = service.execute_action(name, action)
    telemetry_svc.refresh_containers_now()
    return result.to_dict()


@router.delete("/containers/{name}")
def delete_container(
    name: str,
    service: ContainerService = Depends(get_container_service),
    telemetry_svc: TelemetryService = Depends(get_telemetry_service),
):
    result = service.execute_action(name, "remove")
    telemetry_svc.refresh_containers_now()
    return result.to_dict()