from urllib.parse import urlsplit

from backend.core.configs.config import Config
from fastapi import Request


def request_app_base_url(request: Request, app_config: Config) -> str:
    """
    Base URL for browser-facing redirects (OAuth, mock login, post-login return).

    The origin the browser is on, from `Host` and `X-Forwarded-Proto`, in every
    environment: a login started on events.nuspace.kz returns to events.nuspace.kz.
    Falls back to the configured apex (HOME_URL) when `Host` is missing or is not
    one of this environment's hosts (`Config.APP_HOSTS`), so a forged `Host`
    cannot point a redirect elsewhere.

    `X-Forwarded-Host` is never read: nginx does not set it, so only a client could.
    """
    fallback = app_config.HOME_URL.rstrip("/")

    host = request.headers.get("host")
    if not host:
        return fallback
    try:
        parsed = urlsplit(f"//{host}")
        hostname, port = parsed.hostname, parsed.port
    except ValueError:
        return fallback
    if not hostname or hostname not in app_config.APP_HOSTS:
        return fallback

    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower()
    if forwarded_proto in ("http", "https"):
        scheme = forwarded_proto
    else:
        # From the scope, not `request.url`, which a malformed `Host` can garble.
        scheme = request.scope.get("scheme") or "http"
    return f"{scheme}://{hostname}" + (f":{port}" if port else "")
