from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse

from backend.common.dependencies import get_infra
from backend.common.og import Card, canonical_url, card_response, generic_card
from backend.common.schemas import Infra
from backend.modules.auth.dependencies import get_creds_or_guest
from backend.modules.pages.dependencies import get_page_service
from backend.modules.pages.service import PageService

router = APIRouter(tags=["Pages OG"])


def _select_og_image(page_response) -> str | None:
    banner_url = None
    profile_url = None
    fallback_url = None
    for media in page_response.media:
        url = getattr(media, "url", "")
        if not url:
            continue
        if fallback_url is None:
            fallback_url = url
        media_format = getattr(media, "media_format", "")
        media_format_value = getattr(media_format, "value", media_format)
        if media_format_value == "profile":
            profile_url = url
        if media_format_value == "banner":
            banner_url = url
    return profile_url or banner_url or fallback_url


def _page_card(page_response, request: Request) -> Card:
    title = page_response.name or "Page"
    return Card(
        title=title,
        description=f"Learn about {title} on Nuspace.",
        # The Page's address on the host the request came in on.
        url=canonical_url(request, f"/p/{page_response.slug}"),
        image=_select_og_image(page_response),
        link_text="View page",
    )


@router.get("/og/pages", response_class=HTMLResponse, include_in_schema=False)
@router.get("/og/pages/", response_class=HTMLResponse, include_in_schema=False)
async def get_page_og_by_query(
    request: Request,
    id: int | None = None,
    user=Depends(get_creds_or_guest),
    infra: Infra = Depends(get_infra),
    page_service: PageService = Depends(get_page_service),
) -> HTMLResponse:
    """The card for a Page, addressed by id. A Page the viewer may not read is a 404.

    Without an id, `/og/pages` is only a path (the directory), so it gets the
    generic card.
    """
    if id is None:
        return card_response(generic_card(request))
    page_response = await page_service.get_page_response_by_id(infra=infra, page_id=id, user=user)
    return card_response(_page_card(page_response, request))
