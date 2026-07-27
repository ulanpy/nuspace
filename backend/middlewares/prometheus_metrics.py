"""
Exposes Prometheus metrics via a separate ASGI app mounted at /metrics.

Metric names/labels match Grafana dashboard 25040 ("FastAPI Full Observability").
/metrics scrapes are skipped so Alloy traffic does not inflate app panels.

Also emits structured JSON access logs (same method/path labels) for Loki filtering.
"""

import time
import traceback
from typing import Callable

from backend.middlewares.access_log import configure_access_logger, emit_access_log
from fastapi import FastAPI, Request, Response
from prometheus_client import Counter, Gauge, Histogram, Info, make_asgi_app

PROJECT = "nuspace"

REQUESTS = Counter(
    "fastapi_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "project"],
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

_SKIP_PREFIXES = ("/metrics",)


def _should_skip(path: str) -> bool:
    return any(path == p or path.startswith(p + "/") for p in _SKIP_PREFIXES)


def instrument_app(app: FastAPI):
    """Instrument the FastAPI app with Prometheus middleware (dashboard 25040 schema)."""
    configure_access_logger()

    @app.middleware("http")
    async def monitor_requests(request: Request, call_next: Callable):
        raw_path = request.url.path
        if _should_skip(raw_path):
            return await call_next(request)

        method = request.method
        in_progress_path = "[in_flight]"
        REQUEST_IN_PROGRESS.labels(method=method, path=in_progress_path, project=PROJECT).inc()
        start_time = time.time()
        status = "500"
        exc_type: str | None = None
        exc_tb: str | None = None

        try:
            response: Response = await call_next(request)
            status = str(response.status_code)
            return response
        except Exception as exc:
            exc_type = type(exc).__name__
            exc_tb = traceback.format_exc()
            raise
        finally:
            route = request.scope.get("route")
            path_template = route.path if getattr(route, "path", None) else "[unmatched]"
            REQUEST_IN_PROGRESS.labels(method=method, path=in_progress_path, project=PROJECT).dec()
            if _should_skip(path_template):
                return
            duration = time.time() - start_time
            REQUESTS.labels(method=method, path=path_template, project=PROJECT).inc()
            RESPONSES.labels(
                method=method,
                path=path_template,
                status_code=status,
                project=PROJECT,
            ).inc()
            REQUEST_LATENCY.labels(method=method, path=path_template, project=PROJECT).observe(
                duration
            )
            if exc_type:
                EXCEPTIONS.labels(
                    method=method,
                    path=path_template,
                    exception_type=exc_type,
                    project=PROJECT,
                ).inc()
            emit_access_log(
                method=method,
                path=path_template,
                status_code=status,
                duration_seconds=duration,
                exception_type=exc_type,
                traceback_text=exc_tb,
            )
