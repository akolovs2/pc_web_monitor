"""Backward compatibility wrapper delegating to ContainerService."""
from app.dependencies import get_container_service


def container_action(name: str, action: str) -> dict:
    service = get_container_service()
    result = service.execute_action(name, action)
    return result.to_dict()