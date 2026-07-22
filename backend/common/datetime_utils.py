"""UTC storage helpers. Schedule times without tz are always Asia/Almaty."""

from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

CAMPUS_TZ = ZoneInfo("Asia/Almaty")


def utc_now() -> datetime:
    """Callable for SQLAlchemy default=/onupdate= (must not be evaluated at import)."""
    return datetime.now(timezone.utc)


def almaty_to_utc(value: datetime) -> datetime:
    """Naive = Asia/Almaty wall clock; aware → UTC. Used for event start/end (/post, forms)."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=CAMPUS_TZ)
    return value.astimezone(timezone.utc)
