from fastapi import APIRouter, Depends
from app.services.container_service import ContainerService
from app.dependencies import get_container_service

router = APIRouter(prefix="/docker", tags=["Containers"])


@router.post("/containers/{name}/{action}")
def control_container(
    name: str,
    action: str,
    service: ContainerService = Depends(get_container_service),
):
    result = service.execute_action(name, action)
    return result.to_dict()


@router.delete("/containers/{name}")
def delete_container(
    name: str,
    service: ContainerService = Depends(get_container_service),
):
    result = service.execute_action(name, "remove")
    return result.to_dict()