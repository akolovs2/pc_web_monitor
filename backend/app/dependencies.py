"""Dependency injection container wiring ports, adapters, and services."""
from fastapi import Depends, Request
from app.services.telemetry_service import TelemetryService
from app.services.container_service import ContainerService
from app.services.auth_service import AuthService, get_current_user

# Singletons for services holding background state or connections
_telemetry_service = TelemetryService()
_container_service = ContainerService()
_auth_service = AuthService()


def get_telemetry_service() -> TelemetryService:
    """Provides the active TelemetryService instance."""
    return _telemetry_service


def get_container_service() -> ContainerService:
    """Provides the active ContainerService instance."""
    return _container_service


def get_auth_service() -> AuthService:
    """Provides the active AuthService instance."""
    return _auth_service


async def require_auth_user(request: Request, auth_svc: AuthService = Depends(get_auth_service)) -> str:
    """Dependency that guarantees an authenticated user session."""
    return auth_svc.get_current_user_from_request(request)
