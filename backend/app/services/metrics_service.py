import psutil
import docker
import socket
from app.config import config

client = docker.from_env()

def get_cpu_percent() -> float:
    return psutil.cpu_percent(interval=config.METRICS_INTERVAL)

def get_ram_percent() -> float:
    return psutil.virtual_memory().percent

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
        
        return sorted(tasks, key=lambda x: x['memory'], reverse=True)
    except Exception:
        return []
    
def get_containers() -> list[dict]:
    try:
        containers = []
        for c in client.containers.list(all=True):
            data = {
                'id': c.short_id,
                'name': c.name,
                'status': c.status,
                'image': c.image.tags[0] if c.image.tags else 'unknown',
                'cpu': 0.0,
                'memory': 0.0,
                'memory_usage': 0,
                'memory_limit': 0
            }
            
            if c.status == 'running':
                try:
                    stats = c.stats(stream=False)
                    
                    cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                                stats['precpu_stats']['cpu_usage']['total_usage']
                    system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                                   stats['precpu_stats']['system_cpu_usage']
                    
                    if system_delta > 0:
                        data['cpu'] = round((cpu_delta / system_delta) * 100, 2)
                    
                    data['memory_usage'] = stats['memory_stats'].get('usage', 0)
                    data['memory_limit'] = stats['memory_stats'].get('limit', 0)
                    
                    if data['memory_limit'] > 0:
                        data['memory'] = round((data['memory_usage'] / data['memory_limit']) * 100, 2)
                except (KeyError, TypeError):
                    pass
            
            containers.append(data)
        return containers
    except Exception:
        return []
    
def get_hostname() -> str:
    return socket.gethostname()