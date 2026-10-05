import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8002))

    JWT_SECRET = os.getenv("JWT_SECRET")
    SECURE_COOKIES = os.getenv("SECURE_COOKIES", "false").lower() == "true"

    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

config = Config()
