import re

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse

from backend.common.dependencies import get_infra
from backend.common.og import Card, card_response, generic_card, og_path
from backend.common.request_url import request_service
from backend.common.schemas import Infra
from backend.core.configs.config import config
from backend.modules.auth.dependencies import get_creds_or_guest
from backend.modules.events.dependencies import get_event_service
from backend.modules.events.og import event_card
from backend.modules.events.service import EventService
from backend.modules.pages.dependencies import get_page_service
from backend.modules.pages.og import page_card
from backend.modules.pages.service import PageService

router = APIRouter(tags=["OG"])

# The paths with a card of their own, by the host that serves them. A path means
# something only on its host: `/2026` is an event on `events.` and a Page on
# `pages.`, so the host is read first and the path second.
_EVENT_PATH = re.compile(r"/([0-9]+)")
_PAGE_PATH = re.compile(r"/([^/]+)/?")


# One route for every path, so the host decides which card a path gets rather
# than the order the routes were registered in. `{path:path}` also matches the
# empty path, which is a host's root (`/api/og/`).
@router.get("/og/{path:path}", response_class=HTMLResponse, include_in_schema=False)
async def get_og(
    request: Request,
    user=Depends(get_creds_or_guest),
    infra: Infra = Depends(get_infra),
    event_service: EventService = Depends(get_event_service),
    page_service: PageService = Depends(get_page_service),
) -> HTMLResponse:
    """The preview card for the path a bot asked for on the host it asked.

    A path with no card of its own, or whose record the viewer may not read, gets
    the generic card: never an error body, and never a hint that a hidden record
    exists.
    """
    path = og_path(request)
    card: Card | None = None
    match request_service(request, config):
        case "events" if found := _EVENT_PATH.fullmatch(path):
            card = await event_card(request, int(found[1]), user, event_service)
        case "pages" if found := _PAGE_PATH.fullmatch(path):
            card = await page_card(request, found[1], user, infra, page_service)
    return card_response(card or generic_card(request))
