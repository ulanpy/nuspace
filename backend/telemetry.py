"""OpenTelemetry tracing setup for FastAPI (OTLP → Alloy → Tempo)."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from backend.core.configs.config import config

if TYPE_CHECKING:
    from fastapi import FastAPI
    from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


def _endpoint() -> str | None:
    raw = config.OTEL_EXPORTER_OTLP_ENDPOINT.strip()
    return raw or None


def setup_tracer_provider() -> bool:
    """Configure global TracerProvider once. Returns False if tracing is disabled/unavailable."""
    endpoint = _endpoint()
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
        from opentelemetry.sdk.trace.sampling import ALWAYS_ON
    except ImportError:
        logger.warning("OTel packages not installed — tracing skipped")
        return False

    if isinstance(trace.get_tracer_provider(), TracerProvider):
        return True

    sampler = ALWAYS_ON
    if config.OTEL_TRACES_SAMPLER.strip().lower() not in ("always_on", "alwayson"):
        logger.warning(
            "Unknown OTEL_TRACES_SAMPLER=%r, using always_on",
            config.OTEL_TRACES_SAMPLER,
        )

    resource = Resource.create(
        {
            "service.name": config.OTEL_SERVICE_NAME,
            "service.namespace": "nuspace",
        }
    )
    provider = TracerProvider(resource=resource, sampler=sampler)
    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    HTTPXClientInstrumentor().instrument()
    RedisInstrumentor().instrument()
    try:
        from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor

        AsyncPGInstrumentor().instrument()
    except Exception:  # noqa: BLE001
        logger.debug("asyncpg instrumentation skipped", exc_info=True)

    try:
        from opentelemetry.instrumentation.aio_pika import AioPikaInstrumentor

        AioPikaInstrumentor().instrument()
    except Exception:  # noqa: BLE001
        logger.debug("aio_pika instrumentation skipped", exc_info=True)

    logger.info(
        "OTel tracing enabled → %s (service=%s, sampler=%s)",
        endpoint,
        config.OTEL_SERVICE_NAME,
        config.OTEL_TRACES_SAMPLER,
    )
    return True


def instrument_fastapi(app: FastAPI) -> None:
    """HTTP server spans for FastAPI (exclude metrics scrape noise)."""
    try:
        from opentelemetry import trace
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.sdk.trace import TracerProvider
    except ImportError:
        return

    if not isinstance(trace.get_tracer_provider(), TracerProvider):
        return
    FastAPIInstrumentor.instrument_app(
        app,
        excluded_urls="metrics,/metrics,/metrics/",
    )


def instrument_async_engine(engine: AsyncEngine) -> None:
    """SQLAlchemy spans via the sync engine underlying AsyncEngine."""
    try:
        from opentelemetry import trace
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk.trace import TracerProvider
    except ImportError:
        return

    if not isinstance(trace.get_tracer_provider(), TracerProvider):
        return
    try:
        SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)
    except Exception:  # noqa: BLE001
        logger.debug("SQLAlchemy instrumentation skipped", exc_info=True)


def current_trace_ids() -> tuple[str | None, str | None]:
    """Return (trace_id, span_id) hex strings for the active span, if any."""
    try:
        from opentelemetry import trace
    except ImportError:
        return None, None

    span = trace.get_current_span()
    ctx = span.get_span_context()
    if not ctx or not ctx.is_valid:
        return None, None
    return format(ctx.trace_id, "032x"), format(ctx.span_id, "016x")
