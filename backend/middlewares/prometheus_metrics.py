import time
from typing import Callable

from fastapi import FastAPI, Request, Response
from prometheus_client import Counter, Gauge, Histogram, make_asgi_app

"""
Exposes Prometheus metrics via a separate ASGI app mounted at /metrics.

- Metric objects (e.g., Counter, Gauge, Histogram) are global and registered to the default
  registry.
- Middleware instruments the main FastAPI app and updates these metrics on each request.
- The mounted `metrics_app` serves current values from the shared registry when `/metrics`
  is scraped.

Cardinality control strategy:
- Path label uses the Starlette route template (e.g., "/users/{id}") resolved after routing
  completes. Unmatched routes (404) and early failures fall back to a constant label
  "[unmatched]" to avoid raw URL cardinality.
- The in-progress gauge is labeled only by HTTP method (no path) to prevent spawning a series
  per unique path before routing has resolved.
"""


# --- METRIC DEFINITIONS ---
REQUEST_COUNT = Counter("http_request_total", "Total HTTP Requests", ["method", "status", "path"])
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds", "HTTP Request Duration", ["method", "status", "path"]
)
REQUEST_IN_PROGRESS = Gauge("http_requests_in_progress", "HTTP Requests in progress", ["method"])


metrics_app = make_asgi_app()


# --- MIDDLEWARE FUNCTION ---
# function based wrapper elegantly solves circular import
def instrument_app(app: FastAPI):
    """
    Instrument the FastAPI app with Prometheus middleware.

    Metrics emitted per request:
    - Counter `http_request_total{method,status,path}`
    - Histogram `http_request_duration_seconds{method,status,path}`
    - Gauge `http_requests_in_progress{method}`

    Flow:
    1) On entry, increment in-progress by method only.
    2) Delegate to downstream via `call_next`.
    3) In a `finally` block, resolve the route template (post-routing). If unavailable,
       set `path` to "[unmatched]".
    4) Observe duration and increment counters using the template path.
    5) Decrement in-progress.

    Rationale:
    - Resolving the `path` label after routing ensures template values like "/users/{id}"
      instead of raw URLs such as "/users/123".
    - Using a constant for unmatched routes and removing `path` from the in-progress gauge
      prevents high cardinality from 404s, typos, and dynamic path segments.
    """

    @app.middleware("http")
    async def monitor_requests(request: Request, call_next: Callable):
        """Middleware body that records in-progress, counts, and duration per request."""
        method: str = request.method

        # Increment in-progress by method only to avoid pre-routing path cardinality
        REQUEST_IN_PROGRESS.labels(method=method).inc()
        start_time: float = time.time()

        try:
            response: Response = await call_next(request)
            status = str(response.status_code)
        except Exception as e:
            status = "500"
            raise e from None
        finally:
            # Resolve path template AFTER routing; fallback to a constant for unmatched routes
            route = request.scope.get("route")
            path_template = route.path if getattr(route, "path", None) else "[unmatched]"

            duration = time.time() - start_time
            REQUEST_COUNT.labels(method=method, status=status, path=path_template).inc()
            REQUEST_LATENCY.labels(method=method, status=status, path=path_template).observe(
                duration
            )
            REQUEST_IN_PROGRESS.labels(method=method).dec()

        return response
