from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import config
from app.routers import metrics, tasks, containers, terminal
from app.services.auth_service import get_current_user

from app.models.database import init_db

def create_app() -> FastAPI:
    app = FastAPI(
        title="PC/Server Monitor API",
        docs_url=None,
        redoc_url=None,
        openapi_url=None
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(metrics.router)
    app.include_router(terminal.router)
    app.include_router(tasks.router, dependencies=[Depends(get_current_user)])
    app.include_router(containers.router, dependencies=[Depends(get_current_user)])

    @app.on_event("startup")
    async def startup():
        init_db()
        metrics.start_metrics_monitor()

    return app

app = create_app()