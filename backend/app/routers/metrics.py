import asyncio
from fastapi import APIRouter, WebSocket
from app.services import metrics_service
from app.config import config

router = APIRouter()

current_metrics = {
    'hostname': '',
    'cpu': 0,
    'ram': 0,
    'tasks': [],
    'containers': []
}

async def metrics_monitor():
    counter = 0
    loop = asyncio.get_event_loop()

    current_metrics['hostname'] = metrics_service.get_hostname()
    
    while True:
        cpu = await loop.run_in_executor(None, metrics_service.get_cpu_percent)
        current_metrics['cpu'] = cpu
        current_metrics['ram'] = metrics_service.get_ram_percent()
        
        if counter % config.TASKS_UPDATE_INTERVAL == 0:
            current_metrics['tasks'] = await loop.run_in_executor(
                None, metrics_service.get_tasks
            )
        
        if counter % config.CONTAINERS_UPDATE_INTERVAL == 0:
            current_metrics['containers'] = await loop.run_in_executor(
                None, metrics_service.get_containers
            )
        
        counter += 1

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            await websocket.send_json(current_metrics)
            await asyncio.sleep(1)
    except Exception as e:
        print(f"WebSocket connection closed: {e}")

def start_metrics_monitor():
    asyncio.create_task(metrics_monitor())