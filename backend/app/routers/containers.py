from fastapi import APIRouter, Depends
from app.services.container_service import ContainerService
from app.services.telemetry_service import TelemetryService
from app.dependencies import get_container_service, get_telemetry_service

router = APIRouter(prefix="/docker", tags=["Containers"])


@router.post("/containers/{name}/{action}")
def control_container(
    name: str,
    action: str,
    service: ContainerService = Depends(get_container_service),
    telemetry_svc: TelemetryService = Depends(get_telemetry_service),
):
    result = service.execute_action(name, action)
    # Immediately synchronize container state for real-time WebSocket clients
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