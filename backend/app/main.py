from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import config
from app.models.database import database, init_db
from app.routers import metrics, tasks, containers, auth
from app.services.auth_service import get_current_user

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
    
    # Public routes
    app.include_router(auth.router)
    app.include_router(metrics.router)
    
    # Protected routes
    app.include_router(tasks.router, dependencies=[Depends(get_current_user)])
    app.include_router(containers.router, dependencies=[Depends(get_current_user)])
    
    @app.on_event("startup")
    async def startup():
        await init_db()
        metrics.start_metrics_monitor()
    
    @app.on_event("shutdown")
    async def shutdown():
        await database.disconnect()
    
    return app

app = create_app()