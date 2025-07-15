import time
from typing import Callable

import psutil
from fastapi import FastAPI, Request, Response
from prometheus_client import Counter, Gauge, Histogram, make_asgi_app

# --- METRIC DEFINITIONS (Keep these as they are) ---
REQUEST_COUNT = Counter("http_request_total", "Total HTTP Requests", ["method", "status", "path"])
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds", "HTTP Request Duration", ["method", "status", "path"]
)
REQUEST_IN_PROGRESS = Gauge(
    "http_requests_in_progress", "HTTP Requests in progress", ["method", "path"]
)
CPU_USAGE = Gauge("process_cpu_usage", "Current CPU usage in percent")
MEMORY_USAGE = Gauge("process_memory_usage_bytes", "Current memory usage in bytes")


def update_system_metrics():
    """Update system metrics periodically."""
    CPU_USAGE.set(psutil.cpu_percent())
    MEMORY_USAGE.set(psutil.Process().memory_info().rss)


# --- CREATE THE METRICS APP ---
# This creates a separate ASGI app for serving metrics
metrics_app = make_asgi_app()
# Update system metrics once on startup before the first scrape
update_system_metrics()


# --- MIDDLEWARE FUNCTION ---
def instrument_app(app: FastAPI):
    """
    Instrument the FastAPI app with Prometheus middleware.
    This function only adds the middleware, not the endpoint.
    """

    @app.middleware("http")
    async def monitor_requests(request: Request, call_next: Callable):
        method: str = request.method
        # Use the path template if available for better grouping
        path: str = request.scope.get("root_path", "") + request.scope.get("path", "")

        REQUEST_IN_PROGRESS.labels(method=method, path=path).inc()
        start_time = time.time()

        try:
            response: Response = await call_next(request)
            status: str = str(response.status_code)
        except Exception as e:
            status: str = "500"
            raise e from None
        finally:
            duration = time.time() - start_time
            REQUEST_COUNT.labels(method=method, status=status, path=path).inc()
            REQUEST_LATENCY.labels(method=method, status=status, path=path).observe(duration)
            REQUEST_IN_PROGRESS.labels(method=method, path=path).dec()
            # Update system metrics on each request (can be adjusted)
            update_system_metrics()

        return response
