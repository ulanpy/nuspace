"""Optional direct-ASGI HTTP tracing middleware."""

from __future__ import annotations

from typing import Any, Awaitable, Callable

Receive = Callable[[], Awaitable[dict[str, Any]]]
Send = Callable[[dict[str, Any]], Awaitable[None]]
ASGIApp = Callable[[dict[str, Any], Receive, Send], Awaitable[None]]


class TracingMiddleware:
    """Create one server span per request without BaseHTTPMiddleware overhead.

    Add this middleware only after ``setup_tracing`` is enabled. The provider
    then batches completed spans and exports them to Alloy; this wrapper only
    defines the HTTP request boundary and its final status.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http" or scope.get("path", "").startswith("/metrics"):
            await self.app(scope, receive, send)
            return

        from opentelemetry import trace
        from opentelemetry.trace import SpanKind, Status, StatusCode

        method = scope["method"]
        status_code = 500
        tracer = trace.get_tracer(__name__)

        async def send_with_status(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        with tracer.start_as_current_span(
            f"{method} {scope.get('path', '')}",
            kind=SpanKind.SERVER,
            attributes={"http.request.method": method},
        ) as span:
            try:
                await self.app(scope, receive, send_with_status)
            except BaseException as exc:
                span.record_exception(exc)
                span.set_status(Status(StatusCode.ERROR, type(exc).__name__))
                raise
            finally:
                route = getattr(scope.get("route"), "path", None)
                if route:
                    span.update_name(f"{method} {route}")
                    span.set_attribute("http.route", route)
                span.set_attribute("http.response.status_code", status_code)
                if status_code >= 500:
                    span.set_status(Status(StatusCode.ERROR))
