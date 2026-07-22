from datetime import datetime, timedelta

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


def build_time_filter_expressions(time_filter: str):
    """Build SQLAlchemy filter expressions for event time filtering."""
    now = datetime.utcnow()
    expressions = []

    if time_filter == schemas.TimeFilter.UPCOMING:
        expressions.append(Event.end_datetime > now)
    elif time_filter == schemas.TimeFilter.TODAY:
        today_start = datetime.combine(now.date(), datetime.min.time())
        today_end = datetime.combine(now.date(), datetime.max.time())
        expressions.append(
            (
                (Event.start_datetime >= today_start) & (Event.start_datetime <= today_end)
                | (Event.start_datetime < today_start) & (Event.end_datetime > today_start)
            )
            & (Event.end_datetime > now)
        )
    elif time_filter == schemas.TimeFilter.WEEK:
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = datetime.combine(start_of_week.date(), datetime.min.time())
        end_of_week = start_of_week + timedelta(days=7)
        expressions.append(
            (
                (Event.start_datetime >= start_of_week) & (Event.start_datetime < end_of_week)
                | (Event.start_datetime < start_of_week) & (Event.end_datetime > start_of_week)
            )
            & (Event.end_datetime > now)
        )
    elif time_filter == schemas.TimeFilter.MONTH:
        start_of_month = datetime.combine(now.replace(day=1).date(), datetime.min.time())
        if now.month == 12:
            end_of_month = datetime.combine(
                now.replace(year=now.year + 1, month=1, day=1).date(),
                datetime.min.time(),
            )
        else:
            end_of_month = datetime.combine(
                now.replace(month=now.month + 1, day=1).date(),
                datetime.min.time(),
            )
        expressions.append(
            (
                (Event.start_datetime >= start_of_month) & (Event.start_datetime < end_of_month)
                | (Event.start_datetime < start_of_month) & (Event.end_datetime > start_of_month)
            )
            & (Event.end_datetime > now)
        )

    return expressions
