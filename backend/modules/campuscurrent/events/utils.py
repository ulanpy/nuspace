from datetime import datetime, timedelta

from backend.core.database.models import Event, EventScope, EventStatus, EventTag
from backend.modules.campuscurrent.events import schemas


class EventEnrichmentService:
    """Handles the business logic for enriching event data"""

    def __init__(self, user: tuple[dict, dict]):
        self.user = user
        self.user_communities = user[1]["communities"]

    async def enrich_event_data(
        self, event_data: schemas.EventCreateRequest
    ) -> schemas.EnrichedEventCreateRequest:
        # Handle creator_sub
        if event_data.creator_sub == "me":
            event_data.creator_sub = self.user[0].get("sub")

        # Determine scope based on community_id
        scope = EventScope.community if event_data.community_id else EventScope.personal

        if scope == EventScope.community:
            # DEPRECATED: Determine status based on user role and community membership
            # now all events are approved by default
            #status = await self._determine_event_status(event_data)
            status = EventStatus.approved
        else:
            # don't set status for personal events
            status = EventStatus.approved

        # All created events are regular when created
        tag = EventTag.regular

        return schemas.EnrichedEventCreateRequest(
            **event_data.model_dump(), scope=scope, status=status, tag=tag
        )

    async def _determine_event_status(self, event_data: schemas.EventCreateRequest) -> EventStatus:
        # Business logic for determining status
        if event_data.community_id in self.user_communities:
            return EventStatus.approved
        else:
            return EventStatus.pending


def build_time_filter_expressions(time_filter: str):
    """
    Build SQLAlchemy filter expressions for event time filtering.

    Args:
        time_filter: One of schemas.TimeFilter values
        now: Optional fixed current time (UTC). If None, uses datetime.utcnow().

    Returns:
        List of SQLAlchemy boolean expressions to be applied in queries.
    """
    now = datetime.utcnow()
    expressions = []

    if time_filter == schemas.TimeFilter.UPCOMING:
        # Show events that haven't ended yet (upcoming + ongoing)
        expressions.append(Event.end_datetime > now)
    elif time_filter == schemas.TimeFilter.TODAY:
        # Show events that intersect with today AND haven't ended yet
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
        # Show events that intersect with this week AND haven't ended yet
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
        # Show events that intersect with this month AND haven't ended yet
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
