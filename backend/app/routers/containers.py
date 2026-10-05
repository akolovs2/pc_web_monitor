from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
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