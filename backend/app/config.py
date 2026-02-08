# app/config.py
import os

class Config:
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8000))
    
    # Metrics
    CPU_COUNT = os.cpu_count() or 1
    METRICS_INTERVAL = 1
    CONTAINERS_UPDATE_INTERVAL = 10
    TASKS_UPDATE_INTERVAL = 5
    MAX_TASKS = 50
    
    # CORS
    CORS_ORIGINS = ["*"]

config = Config()