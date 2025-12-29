# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import config
from app.routers import metrics, tasks, remote

def create_app() -> FastAPI:
    app = FastAPI(
        title="PC Monitor API",
        description="Monitor and control your PC remotely",
        version="1.0.0"
    )
    
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Routers
    app.include_router(metrics.router)
    app.include_router(tasks.router)
    app.include_router(remote.router)
    
    # Startup events
    @app.on_event("startup")
    async def startup():
        metrics.start_metrics_monitor()
    
    return app

app = create_app()