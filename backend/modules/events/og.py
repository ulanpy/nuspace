from fastapi import Request

from backend.common.og import Card, canonical_url, og_path, one_line, readable
from backend.modules.events.service import EventService


def _select_og_image(event_response) -> str | None:
    for media in event_response.media:
        if getattr(media, "url", ""):
            return media.url
    return None


async def event_card(
    request: Request, event_id: int, user, event_service: EventService
) -> Card | None:
    """The card for `events.nuspace.kz/<id>`, or None when the viewer may not read
    the event (missing, pending, rejected)."""
    event_response = await readable(event_service.get_event_by_id(event_id=event_id, user=user))
    if event_response is None:
        return None
    return Card(
        title=event_response.name or "Event",
        description=one_line(event_response.description or "", 220),
        url=canonical_url(request, og_path(request)),
        image=_select_og_image(event_response),
        og_type="event",
        link_text="View event",
    )
