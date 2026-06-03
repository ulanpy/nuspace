from backend.core.configs.config import Config
from fastapi import Request


def request_app_base_url(request: Request, app_config: Config) -> str:
    """
    Base URL for browser-facing redirects (OAuth, mock login, post-login return).

    Production: configured NUSPACE origin.
    Debug: origin of the incoming request (localhost vs ephemeral tunnel).
    """
    if not app_config.IS_DEBUG:
        return app_config.NUSPACE.rstrip("/")

    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")
    host = forwarded_host or request.headers.get("host")
    if host:
        scheme = forwarded_proto or request.url.scheme
        return f"{scheme}://{host}".rstrip("/")

    return app_config.HOME_URL.rstrip("/")
