"""Domain and application exceptions for pc_web_monitor."""

class DomainError(Exception):
    """Base exception for domain errors."""
    pass


class NotFoundError(DomainError):
    """Raised when an entity or resource is not found."""
    pass


class ActionNotPermittedError(DomainError):
    """Raised when an action is not permitted on a resource."""
    pass


class AuthenticationFailedError(DomainError):
    """Raised when credentials or tokens fail authentication."""
    pass
