"""OpenTelemetry provider/bootstrap; HTTP spans are implemented in middleware."""

from __future__ import annotations

import logging
from opentelemetry.sdk.trace.sampling import Sampler
import os
from threading import Lock
from time import monotonic
from typing import TYPE_CHECKING, Any

from backend.core.configs.config import config

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

_FORCED_TRACE_PATHS = frozenset(
    {
        # Auth API (these routes have no common /auth prefix).
        "/login",
        "/auth/callback",
        "/connect-tg",
        "/refresh-token",
        "/logout",
        # Registrar and degree-audit operations that call external systems or
        # process user-provided documents.
        "/registered_courses/sync",
        "/registered_courses/schedule/google",
        "/degree-audit/audit/registrar",
    }
)


def _normalise_request_path(path: str) -> str:
    """Match both direct ASGI paths and the application's ``/api`` root path."""
    return path.removeprefix("/api") or "/"


class _TokenBucket:
    """Thread-safe, in-process admission budget for root spans."""

    def __init__(self, rate_per_second: float) -> None:
        if rate_per_second <= 0:
            raise ValueError("OpenTelemetry trace budget must be greater than zero")
        self._rate_per_second = rate_per_second
        self._capacity = rate_per_second
        self._tokens = rate_per_second
        self._last_refill = monotonic()
        self._lock = Lock()

    def try_consume(self) -> bool:
        now = monotonic()
        with self._lock:
            elapsed = now - self._last_refill
            self._tokens = min(self._capacity, self._tokens + elapsed * self._rate_per_second)
            self._last_refill = now
            if self._tokens < 1:
                return False
            self._tokens -= 1
            return True


class _RouteRateLimitSampler(Sampler):
    """Sample HTTP roots through separate normal and critical token buckets."""

    def __init__(
        self,
        normal_bucket: _TokenBucket,
        critical_bucket: _TokenBucket,
        sampled_result: Any,
        dropped_result: Any,
    ) -> None:
        self._normal_bucket = normal_bucket
        self._critical_bucket = critical_bucket
        self._sampled_result = sampled_result
        self._dropped_result = dropped_result

    def should_sample(
        self,
        parent_context,
        trace_id,
        name,
        kind=None,
        attributes=None,
        links=None,
        trace_state=None,
    ):
        # The server-span name is ``METHOD raw-path`` at sampling time. Route
        # resolution happens further inside FastAPI, so it cannot be used here.
        _method, _separator, path = name.partition(" ")
        bucket = (
            self._critical_bucket
            if _normalise_request_path(path) in _FORCED_TRACE_PATHS
            else self._normal_bucket
        )
        return self._sampled_result if bucket.try_consume() else self._dropped_result

    def get_description(self) -> str:
        return "RouteRateLimitSampler{normal and critical token buckets}"


def tracing_enabled() -> bool:
    """Local tracing switch; keeps the HTTP boundary and exporter in sync."""
    return os.getenv("TRACING_ENABLED", "true").lower() in {"1", "true", "yes"}


def setup_tracing() -> bool:
    """Configure exporter, batching and library instrumentors once per process."""
    if not tracing_enabled():
        logger.info("OTel tracing disabled (TRACING_ENABLED is false)")
        return False

    endpoint = config.OTEL_EXPORTER_OTLP_ENDPOINT.strip() or None
    if endpoint is None:
        logger.info("OTel tracing disabled (OTEL_EXPORTER_OTLP_ENDPOINT empty)")
        return False
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.sdk.trace.sampling import (
            Decision,
            ParentBased,
            SamplingResult,
        )
    except ImportError:
        logger.warning("OTel packages not installed — tracing skipped")
        return False

    if isinstance(trace.get_tracer_provider(), TracerProvider):
        return True
    provider = TracerProvider(
        resource=Resource.create(
            {"service.name": config.OTEL_SERVICE_NAME, "service.namespace": "nuspace"}
        ),
        # Decide at the HTTP boundary. Both buckets begin full, so low traffic
        # is traced completely; after a spike exhausts a bucket, the remaining
        # roots and all their children become non-recording until it refills.
        sampler=ParentBased(
            root=_RouteRateLimitSampler(
                normal_bucket=_TokenBucket(config.OTEL_TRACE_NORMAL_MAX_PER_SECOND),
                critical_bucket=_TokenBucket(config.OTEL_TRACE_CRITICAL_MAX_PER_SECOND),
                sampled_result=SamplingResult(Decision.RECORD_AND_SAMPLE),
                dropped_result=SamplingResult(Decision.DROP),
            )
        ),
    )
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint, insecure=True))
    )
    trace.set_tracer_provider(provider)
    HTTPXClientInstrumentor().instrument()
    RedisInstrumentor().instrument()
    # SQLAlchemy owns every application database call. Instrumenting its
    # asyncpg driver as well would create a second, low-level DB span for the
    # same query and doubles the SDK/export overhead before tail sampling.
    for module_name, class_name in (
        ("opentelemetry.instrumentation.aio_pika", "AioPikaInstrumentor"),
    ):
        try:
            module = __import__(module_name, fromlist=[class_name])
            getattr(module, class_name)().instrument()
        except Exception:  # noqa: BLE001
            logger.debug("%s instrumentation skipped", class_name, exc_info=True)
    return True


async def cleanup_tracing() -> None:
    """Flush batched spans before the process exits."""
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
    except ImportError:
        return
    provider = trace.get_tracer_provider()
    if isinstance(provider, TracerProvider):
        provider.force_flush()
        provider.shutdown()


def instrument_async_engine(engine: AsyncEngine) -> None:
    """Install SQLAlchemy spans only when a real tracer provider is active."""
    try:
        from opentelemetry import trace
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk.trace import TracerProvider
    except ImportError:
        return
    if isinstance(trace.get_tracer_provider(), TracerProvider):
        SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)


def current_trace_ids() -> tuple[str | None, str | None]:
    try:
        from opentelemetry import trace
    except ImportError:
        return None, None
    context = trace.get_current_span().get_span_context()
    if not context or not context.is_valid:
        return None, None
    return format(context.trace_id, "032x"), format(context.span_id, "016x")
