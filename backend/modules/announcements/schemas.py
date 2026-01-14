from pydantic import BaseModel

from backend.modules.campuscurrent.communities.schemas import ListCommunity, ListPhotoAlbums
from backend.modules.campuscurrent.events.schemas import ListEventResponse


class AnnouncementsBundleResponse(BaseModel):
    """
    Aggregated response for the announcements landing page to reduce request count.
    """

    photo_albums: ListPhotoAlbums
    communities: ListCommunity
    events: ListEventResponse

