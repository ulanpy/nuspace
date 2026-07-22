from datetime import datetime, time, timedelta, timezone

from backend.common.datetime_utils import CAMPUS_TZ
from backend.modules.campuscurrent.events import schemas
from backend.modules.campuscurrent.models import Event, EventStatus, EventTag


class EventEnrichmentService:
    """Handles the business logic for enriching event data."""

    def __init__(self, user: tuple[dict, dict]):
        self.user = user

    async def enrich_event_data(
        self, event_data: schemas.EventCreateRequest
    ) -> schemas.EnrichedEventCreateRequest:
        if event_data.creator_sub == "me":
            event_data.creator_sub = self.user[0].get("sub")

        return schemas.EnrichedEventCreateRequest(
            **event_data.model_dump(),
            status=EventStatus.approved,
            tag=EventTag.regular,
        )


def _campus_day_start(local_dt: datetime) -> datetime:
    """Start of campus-local calendar day as UTC instant."""
    return datetime.combine(local_dt.date(), time.min, tzinfo=CAMPUS_TZ).astimezone(timezone.utc)


def build_time_filter_expressions(time_filter: str):
    """Build SQLAlchemy filter expressions for event time filtering (UTC vs campus calendar)."""
    now = datetime.now(timezone.utc)
    local_now = now.astimezone(CAMPUS_TZ)
    expressions = []

    if time_filter == schemas.TimeFilter.UPCOMING:
        expressions.append(Event.end_datetime > now)
    elif time_filter == schemas.TimeFilter.TODAY:
        today_start = _campus_day_start(local_now)
        today_end = today_start + timedelta(days=1)
        expressions.append(
            (
                (Event.start_datetime >= today_start) & (Event.start_datetime < today_end)
                | (Event.start_datetime < today_start) & (Event.end_datetime > today_start)
            )
            & (Event.end_datetime > now)
        )
    elif time_filter == schemas.TimeFilter.WEEK:
        start_of_week_local = local_now - timedelta(days=local_now.weekday())
        start_of_week = _campus_day_start(start_of_week_local)
        end_of_week = start_of_week + timedelta(days=7)
        expressions.append(
            (
                (Event.start_datetime >= start_of_week) & (Event.start_datetime < end_of_week)
                | (Event.start_datetime < start_of_week) & (Event.end_datetime > start_of_week)
            )
            & (Event.end_datetime > now)
        )
    elif time_filter == schemas.TimeFilter.MONTH:
        start_of_month_local = local_now.replace(day=1)
        start_of_month = _campus_day_start(start_of_month_local)
        if local_now.month == 12:
            next_month_local = local_now.replace(year=local_now.year + 1, month=1, day=1)
        else:
            next_month_local = local_now.replace(month=local_now.month + 1, day=1)
        end_of_month = _campus_day_start(next_month_local)
        expressions.append(
            (
                (Event.start_datetime >= start_of_month) & (Event.start_datetime < end_of_month)
                | (Event.start_datetime < start_of_month) & (Event.end_datetime > start_of_month)
            )
            & (Event.end_datetime > now)
        )

    return expressions
