from pydantic import BaseModel

from backend.modules.campuscurrent.events.schemas import ListEventResponse


class AnnouncementsBundleResponse(BaseModel):
    """
    Aggregated response for the announcements landing page to reduce request count.
    """

    events: ListEventResponse
    recruitment_events: ListEventResponse
