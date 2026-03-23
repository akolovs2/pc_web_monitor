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

    JWT_SECRET = os.getenv("JWT_SECRET")
    SECURE_COOKIES = os.getenv("SECURE_COOKIES", "false").lower() == "true"
    
    CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]

config = Config()