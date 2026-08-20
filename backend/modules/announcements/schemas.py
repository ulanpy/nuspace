from backend.modules.campuscurrent.events.schemas import ListEventResponse
from pydantic import BaseModel


class AnnouncementsBundleResponse(BaseModel):
    """
    Aggregated response for the announcements landing page to reduce request count.
    """

    events: ListEventResponse
