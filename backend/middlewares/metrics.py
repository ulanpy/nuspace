"""Prometheus HTTP metrics implemented as a low-overhead ASGI middleware."""

from __future__ import annotations

import threading
from time import perf_counter
from typing import Any, Awaitable, Callable

from prometheus_client import Counter, Gauge, Histogram, Info, make_asgi_app

PROJECT = "nuspace"
_SKIP_PREFIXES = ("/metrics",)
_CHILDREN_LOCK = threading.Lock()
_METRIC_CHILDREN: dict[tuple[str, ...], Any] = {}

Receive = Callable[[], Awaitable[dict[str, Any]]]
Send = Callable[[dict[str, Any]], Awaitable[None]]
ASGIApp = Callable[[dict[str, Any], Receive, Send], Awaitable[None]]

REQUESTS = Counter(
    "fastapi_http_requests_total", "Total HTTP requests", ["method", "path", "project"]
)
RESPONSES = Counter(
    "fastapi_http_responses_total",
    "Total HTTP responses by status",
    ["method", "path", "status_code", "project"],
)
REQUEST_LATENCY = Histogram(
    "fastapi_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "path", "project"],
)
REQUEST_IN_PROGRESS = Gauge(
    "fastapi_http_requests_in_progress",
    "HTTP requests in progress",
    ["method", "path", "project"],
)
EXCEPTIONS = Counter(
    "fastapi_http_exceptions_total",
    "Total unhandled exceptions",
    ["method", "path", "exception_type", "project"],
)
APP_INFO = Info("fastapi_app", "FastAPI application info")
APP_INFO.info({"project": PROJECT, "app": "nuspace"})
metrics_app = make_asgi_app()


def _should_skip(path: str) -> bool:
    return any(path == prefix or path.startswith(prefix + "/") for prefix in _SKIP_PREFIXES)


def _child(metric: Any, cache_key: tuple[str, ...], **labels: str) -> Any:
    """Cache a Prometheus time series after its first label lookup.

    ``metric.labels(...)`` finds (or creates) a child time series under a
    client-library lock. Routes are low-cardinality templates such as
    ``/events`` rather than raw URLs, so retaining children by
    method/route/status is bounded and later requests only call ``inc`` or
    ``observe`` on the cached child.
    """
    child = _METRIC_CHILDREN.get(cache_key)
    if child is not None:
        return child
    with _CHILDREN_LOCK:
        return _METRIC_CHILDREN.setdefault(cache_key, metric.labels(**labels))


class PrometheusMetricsMiddleware:
    """Collect dashboard-compatible metrics without BaseHTTPMiddleware overhead.

    This is a native ASGI wrapper: it receives ASGI messages directly instead
    of allocating Starlette ``Request``/``Response`` objects. ``perf_counter``
    is a monotonic high-resolution timer, so elapsed request time is not
    distorted if the system clock changes. The wrapped ``send`` observes the
    outgoing ``http.response.start`` message, which is where ASGI exposes the
    final HTTP status code before it reaches the client.
    """

    def __init__(self, app: ASGIApp):
        self.app = app
        self.enabled = True

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http" or not self.enabled:
            await self.app(scope, receive, send)
            return

        raw_path = scope.get("path", "")
        if _should_skip(raw_path):
            await self.app(scope, receive, send)
            return

        method = scope["method"]
        in_flight = _child(
            REQUEST_IN_PROGRESS,
            ("in_flight", method),
            method=method,
            path="[in_flight]",
            project=PROJECT,
        )
        in_flight.inc()
        status_code = "500"
        exception_type: str | None = None
        started = perf_counter()

        async def send_with_status(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = str(message["status"])
            await send(message)

        try:
            await self.app(scope, receive, send_with_status)
        except BaseException as exc:
            exception_type = type(exc).__name__
            raise
        finally:
            in_flight.dec()
            route = scope.get("route")
            path = getattr(route, "path", None) or "[unmatched]"
            if _should_skip(path):
                return

            labels = {"method": method, "path": path, "project": PROJECT}
            _child(REQUESTS, ("requests", method, path), **labels).inc()
            _child(
                RESPONSES,
                ("responses", method, path, status_code),
                **labels,
                status_code=status_code,
            ).inc()
            _child(REQUEST_LATENCY, ("latency", method, path), **labels).observe(
                perf_counter() - started
            )
            if exception_type:
                _child(
                    EXCEPTIONS,
                    ("exceptions", method, path, exception_type),
                    **labels,
                    exception_type=exception_type,
                ).inc()
