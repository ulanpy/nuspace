from fastapi import HTTPException, Request, status

from backend.common.og import Card, canonical_url
from backend.common.schemas import Infra
from backend.modules.pages.service import PageService


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


async def page_card(
    request: Request, slug: str, user, infra: Infra, page_service: PageService
) -> Card | None:
    """The card for `pages.nuspace.kz/<slug>`, or None when the viewer may not read it.

    The read is the one `GET /pages/{slug}` makes, so the visibility predicate
    decides. A Page the viewer may not read has no card, and the caller's generic
    card is built from the path alone, so it does not confirm the Page exists.
    """
    try:
        page_response = await page_service.get_page_response(infra=infra, slug=slug, user=user)
    except HTTPException as exc:
        if exc.status_code not in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND):
            raise
        return None
    title = page_response.name or "Page"
    return Card(
        title=title,
        description=f"Learn about {title} on Nuspace.",
        url=canonical_url(request, f"/{page_response.slug}"),
        image=_select_og_image(page_response),
        link_text="View page",
    )
