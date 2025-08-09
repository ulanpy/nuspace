import time
from typing import Callable

from fastapi import FastAPI, Request, Response
from prometheus_client import Counter, Gauge, Histogram, make_asgi_app

"""
Exposes Prometheus metrics via a separate ASGI app mounted at /metrics.

- Metric objects (e.g., Counter, Gauge) are global and registered to the default registry.
- Middleware instruments the main FastAPI app and updates these metrics on each request.
- The mounted metrics_app serves the current values from the shared registry when /metrics 
- is scraped.
"""


# --- METRIC DEFINITIONS ---
REQUEST_COUNT = Counter("http_request_total", "Total HTTP Requests", ["method", "status", "path"])
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds", "HTTP Request Duration", ["method", "status", "path"]
)
REQUEST_IN_PROGRESS = Gauge(
    "http_requests_in_progress", "HTTP Requests in progress", ["method", "path"]
)


metrics_app = make_asgi_app()


# --- MIDDLEWARE FUNCTION ---
# function based wrapper elegantly solves circular import
def instrument_app(app: FastAPI):
    """
    Instrument the FastAPI app with Prometheus middleware

    """

    @app.middleware("http")
    async def monitor_requests(request: Request, call_next: Callable):
        method: str = request.method

        route = request.scope.get("route")  # path template /users/{id}
        path_template = route.path if route else request.url.path

        REQUEST_IN_PROGRESS.labels(method=method, path=path_template).inc()
        start_time: float = time.time()

        try:
            response: Response = await call_next(request)
            status = str(response.status_code)
        except Exception as e:
            status = "500"
            raise e from None
        finally:
            duration = time.time() - start_time
            REQUEST_COUNT.labels(method=method, status=status, path=path_template).inc()
            REQUEST_LATENCY.labels(method=method, status=status, path=path_template).observe(
                duration
            )
            REQUEST_IN_PROGRESS.labels(method=method, path=path_template).dec()

        return response
