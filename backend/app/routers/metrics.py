import asyncio
from fastapi import APIRouter, WebSocket, Depends
from app.services.telemetry_service import TelemetryService
from app.dependencies import get_telemetry_service

router = APIRouter(tags=["Metrics"])


@router.get("/metrics/history")
async def get_history(
    range: str = "24h",
    limit: int = 500,
    service: TelemetryService = Depends(get_telemetry_service),
):
    """Fetches downsampled historical telemetry for graphs and dashboards."""
    return await service.get_history(range, limit)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Streams real-time telemetry state to connected frontend dashboards."""
    await websocket.accept()
    service = get_telemetry_service()

    try:
        while True:
            metrics_data = service.get_current_metrics()
            await websocket.send_json(metrics_data)
            await asyncio.sleep(1)
    except Exception as e:
        print(f"[MetricsWS] Connection closed: {e}")


def start_metrics_monitor():
    """Initializes the background telemetry ingestion worker."""
    service = get_telemetry_service()
    service.start_worker()