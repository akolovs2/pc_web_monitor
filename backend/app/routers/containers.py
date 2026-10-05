from fastapi import APIRouter
from app.services import containers_service

router = APIRouter(prefix="/docker")

@router.post("/containers/{name}/{action}")
def control_container(name: str, action: str):
    if action not in ["start", "stop", "restart", "remove", "delete"]:
        return {"error": "Invalid action"}
    return containers_service.container_action(name, action)

@router.delete("/containers/{name}")
def delete_container(name: str):
    return containers_service.container_action(name, "remove")