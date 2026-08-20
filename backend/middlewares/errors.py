"""Structured logging for unhandled HTTP exceptions."""

from __future__ import annotations

import sys
import threading
import traceback
from typing import Any, Awaitable, Callable

import orjson

Receive = Callable[[], Awaitable[dict[str, Any]]]
Send = Callable[[dict[str, Any]], Awaitable[None]]
ASGIApp = Callable[[dict[str, Any], Receive, Send], Awaitable[None]]

_STDOUT_LOCK = threading.Lock()
_JSON_500_BODY = orjson.dumps({"detail": "Internal Server Error"})


def _request_header(scope: dict[str, Any], name: bytes) -> str | None:
    for key, value in scope.get("headers", ()):  # ASGI headers are lower-case bytes.
        if key == name:
            return value.decode("latin-1")
    return None


def emit_unhandled_exception_log(scope: dict[str, Any], exc: Exception) -> None:
    """Emit one JSON line so Docker/Loki do not split a multiline traceback."""
    from backend.bootstrap.tracing import current_trace_ids

    state = scope.get("state", {})
    route = scope.get("route")
    trace_id, span_id = current_trace_ids()
    payload: dict[str, Any] = {
        "level": "error",
        "log_type": "error",
        "method": scope.get("method"),
        "path": getattr(route, "path", None) or "[unmatched]",
        "raw_path": scope.get("path"),
        "request_id": _request_header(scope, b"x-request-id"),
        "user_sub": state.get("user_sub"),
        "is_guest": state.get("is_guest"),
        "actor": state.get("actor"),
        "exception_type": type(exc).__name__,
        "traceback": "".join(traceback.format_exception(exc)),
    }
    if trace_id:
        payload["trace_id"] = trace_id
    if span_id:
        payload["span_id"] = span_id

    with _STDOUT_LOCK:
        sys.stdout.buffer.write(orjson.dumps(payload) + b"\n")
        # Successful access logs no longer use FastAPI stdout. Errors are rare
        # and must survive long idle periods, so flush this one JSON line.
        sys.stdout.buffer.flush()


class UnhandledExceptionLoggingMiddleware:
    """Log unexpected HTTP failures once and return a generic JSON 500.

    Expected ``HTTPException`` instances are handled by FastAPI's exception
    middleware before reaching this wrapper. The catch is intentionally limited
    to ``Exception`` so cancellation and process-control exceptions still
    propagate normally.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        response_started = False

        async def send_with_state(message):
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, send_with_state)
        except Exception as exc:
            emit_unhandled_exception_log(scope, exc)
            if response_started:
                # A streaming response may already have sent headers/body; its
                # protocol cannot be replaced with a valid JSON 500.
                raise
            await send(
                {
                    "type": "http.response.start",
                    "status": 500,
                    "headers": [(b"content-type", b"application/json")],
                }
            )
            await send({"type": "http.response.body", "body": _JSON_500_BODY})
