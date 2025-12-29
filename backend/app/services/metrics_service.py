# app/services/metrics_service.py
import psutil
from app.config import config

def get_cpu_percent() -> float:
    return psutil.cpu_percent(interval=config.METRICS_INTERVAL)

def get_ram_percent() -> float:
    return psutil.virtual_memory().percent

def get_services() -> list[dict]:
    try:
        return [
            {'name': service.name(), 'status': service.status()} 
            for service in psutil.win_service_iter()
        ]
    except Exception:
        return []

def get_tasks() -> list[dict]:
    try:
        tasks = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
            try:
                info = proc.info
                cpu_normalized = (info['cpu_percent'] or 0) / config.CPU_COUNT
                tasks.append({
                    'pid': info['pid'],
                    'name': info['name'],
                    'cpu': round(cpu_normalized, 1),
                    'memory': round(info['memory_percent'] or 0, 1),
                    'status': info['status']
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        return sorted(tasks, key=lambda x: x['memory'], reverse=True)[:config.MAX_TASKS]
    except Exception:
        return []