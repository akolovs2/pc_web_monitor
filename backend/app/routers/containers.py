from fastapi import APIRouter
from app.services import containers_service

router = APIRouter()

@router.post("/containers/{name}/{action}")
def control_container(name: str, action: str):
    if action not in ["start", "stop", "restart"]:
        return {"error": "Invalid action"}
    return containers_service.container_action(name, action)