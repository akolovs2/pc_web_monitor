import asyncio
from fastapi import APIRouter, WebSocket
from app.services import metrics_service, metrics_recorder
from app.config import config

router = APIRouter()

current_metrics = {
    'hostname': '',
    'cpu': 0,
    'ram': 0,
    'storage': 0,
    'storage_used': 0,
    'storage_total': 0,
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
        
        storage_info = await loop.run_in_executor(None, metrics_service.get_storage_info)
        current_metrics['storage'] = storage_info['percent']
        current_metrics['storage_used'] = storage_info['used_gb']
        current_metrics['storage_total'] = storage_info['total_gb']
        
        if counter % config.TASKS_UPDATE_INTERVAL == 0:
            current_metrics['tasks'] = await loop.run_in_executor(
                None, metrics_service.get_tasks
            )
        
        if counter % config.CONTAINERS_UPDATE_INTERVAL == 0:
            current_metrics['containers'] = await loop.run_in_executor(
                None, metrics_service.get_containers
            )
        
        # Save snapshot every METRICS_RECORD_INTERVAL (default: 10 seconds)
        if counter % config.METRICS_RECORD_INTERVAL == 0:
            containers = current_metrics.get('containers', [])
            running_count = sum(1 for c in containers if c.get('status') == 'running')
            await loop.run_in_executor(
                None,
                metrics_recorder.record_metric_snapshot,
                current_metrics['cpu'],
                current_metrics['ram'],
                current_metrics['storage'],
                current_metrics['storage_used'],
                current_metrics['storage_total'],
                len(containers),
                running_count,
            )

        # Cleanup old records (>14 days) every hour
        if counter > 0 and counter % 3600 == 0:
            await loop.run_in_executor(
                None,
                metrics_recorder.cleanup_old_metrics,
                config.METRICS_RETENTION_DAYS,
            )

        counter += 1

@router.get("/metrics/history")
async def get_history(range: str = "24h", limit: int = 500):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        metrics_recorder.get_metrics_history,
        range,
        limit,
    )

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