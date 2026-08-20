"""Attach application-only access-log context for the reverse proxy."""

from __future__ import annotations

from typing import Any, Awaitable, Callable

Receive = Callable[[], Awaitable[dict[str, Any]]]
Send = Callable[[dict[str, Any]], Awaitable[None]]
ASGIApp = Callable[[dict[str, Any], Receive, Send], Awaitable[None]]

_HEADER_PREFIX = b"x-internal-log-"


def _header_value(value: object) -> bytes:
    """Return a safe, ASCII response-header value for Nginx-only metadata."""
    return str(value).replace("\r", " ").replace("\n", " ").encode("ascii", "replace")


class AccessContextMiddleware:
    """Expose low-cost request context to Nginx without emitting an access log.

    Nginx owns successful HTTP access logging.  It reads these response headers
    from its upstream, logs them to its buffered JSON file, and removes them
    before the response reaches the client.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_access_context(message):
            if message["type"] == "http.response.start":
                state = scope.get("state", {})
                route = scope.get("route")
                route_path = getattr(route, "path", None) or "[unmatched]"
                headers = list(message.get("headers", ()))
                headers.append((_HEADER_PREFIX + b"route", _header_value(route_path)))
                if state.get("user_sub") is not None:
                    headers.append(
                        (_HEADER_PREFIX + b"user-sub", _header_value(state["user_sub"]))
                    )
                if state.get("is_guest") is not None:
                    headers.append(
                        (_HEADER_PREFIX + b"guest", _header_value(str(bool(state["is_guest"])).lower()))
                    )
                if state.get("actor") is not None:
                    headers.append((_HEADER_PREFIX + b"actor", _header_value(state["actor"])))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_access_context)
