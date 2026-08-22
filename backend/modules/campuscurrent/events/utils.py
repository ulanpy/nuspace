from backend.modules.campuscurrent.events import schemas
from backend.modules.campuscurrent.models import EventStatus, EventTag


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
