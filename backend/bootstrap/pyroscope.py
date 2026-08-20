"""Pyroscope process-profiler bootstrap."""

import logging

from backend.core.configs.config import config

logger = logging.getLogger(__name__)


def setup_pyroscope() -> bool:
    """Start the in-process profiler and configure its export destination."""
    try:
        import pyroscope
        address = "http://pyroscope:4040"
        pyroscope.configure(
            application_name=config.OTEL_SERVICE_NAME,
            server_address=address,
            tags={"service_name": config.OTEL_SERVICE_NAME, "namespace": "nuspace"},
        )
    except ImportError:
        logger.warning("pyroscope-io is not installed — profiling skipped")
        return False
    logger.info("Pyroscope profiling enabled → %s", address)
    return True
