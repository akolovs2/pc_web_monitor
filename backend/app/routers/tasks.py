# Deprecated module, but can be useful for futureproofing.
from fastapi import APIRouter
from app.services.process_service import kill_process
from app.models.schemas import KillResponse

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("/kill/{pid}", response_model=KillResponse)
async def kill_task(pid: int):
    return kill_process(pid)