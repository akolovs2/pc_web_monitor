import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8001))
    
    CPU_COUNT = os.cpu_count() or 1
    METRICS_INTERVAL = 1
    CONTAINERS_UPDATE_INTERVAL = 10
    TASKS_UPDATE_INTERVAL = 5
    MAX_TASKS = 50

    JWT_SECRET = os.getenv("JWT_SECRET", "homelab-pc-web-monitor-default-secret-key-change-in-env")
    SECURE_COOKIES = os.getenv("SECURE_COOKIES", "false").lower() == "true"
    SSH_HOST = os.getenv("SSH_HOST", "127.0.0.1")
    SSH_PORT = int(os.getenv("SSH_PORT", 22))

    CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
    HIDDEN_CONTAINERS = [name.strip() for name in os.getenv("HIDDEN_CONTAINERS", "pc_web_monitor-").split(",") if name.strip()]

    METRICS_RECORD_INTERVAL = int(os.getenv("METRICS_RECORD_INTERVAL", 10))
    METRICS_RETENTION_DAYS = int(os.getenv("METRICS_RETENTION_DAYS", 14))
    DB_PATH = os.getenv("METRICS_DB_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "metrics.db"))

config = Config()