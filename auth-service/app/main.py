from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import config
from app.models.database import database, init_db
from app.routers import auth

def create_app() -> FastAPI:
    app = FastAPI(
        title="Auth Service",
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

    app.include_router(auth.router)

    @app.on_event("startup")
    async def startup():
        await init_db()

    @app.on_event("shutdown")
    async def shutdown():
        await database.disconnect()

    return app

app = create_app()
