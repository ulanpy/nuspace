from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from backend.common.og import card_response, generic_card

router = APIRouter(tags=["OG"])


# Registered after the routes with a specific card, so those win. `{path:path}`
# also matches the empty path, which is a host's root (`/api/og/`).
@router.get("/og/{path:path}", response_class=HTMLResponse, include_in_schema=False)
async def get_generic_og(request: Request) -> HTMLResponse:
    return card_response(generic_card(request))
