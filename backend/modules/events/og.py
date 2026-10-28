from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse

from backend.common.og import (
    Card,
    canonical_url,
    card_response,
    generic_card,
    og_path,
    one_line,
)
from backend.common.request_url import request_service
from backend.core.configs.config import config
from backend.modules.auth.dependencies import get_creds_or_guest
from backend.modules.events.dependencies import get_event_service
from backend.modules.events.service import EventService

router = APIRouter(tags=["Events OG"])


def _select_og_image(event_response) -> str | None:
    for media in event_response.media:
        if getattr(media, "url", ""):
            return media.url
    return None


def _event_card(event_response, request: Request) -> Card:
    return Card(
        title=event_response.name or "Event",
        description=one_line(event_response.description or "", 220),
        url=canonical_url(request, og_path(request)),
        image=_select_og_image(event_response),
        og_type="event",
        link_text="View event",
    )


@router.get("/og/{event_id:int}", response_class=HTMLResponse, include_in_schema=False)
async def get_event_og(
    request: Request,
    event_id: int,
    user=Depends(get_creds_or_guest),
    event_service: EventService = Depends(get_event_service),
) -> HTMLResponse:
    """The card for `events.nuspace.kz/<id>`; the id is the path, as the host serves it.

    Only the events host serves events at a bare number, so on any other host this
    is just a path. An event the viewer may not read (missing, pending, rejected)
    gets the generic card, never an error body, and so does not confirm it exists.
    """
    if request_service(request, config) != "events":
        return card_response(generic_card(request))
    try:
        event_response = await event_service.get_event_by_id(event_id=event_id, user=user)
    except HTTPException as exc:
        if exc.status_code not in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND):
            raise
        return card_response(generic_card(request))
    return card_response(_event_card(event_response, request))
