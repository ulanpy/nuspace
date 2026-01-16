from html import escape

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_creds_or_guest, get_db_session, get_infra
from backend.common.schemas import Infra
from backend.modules.campuscurrent.communities import dependencies as deps
from backend.modules.campuscurrent.communities.service import CommunityService

router = APIRouter(tags=["Communities OG"])


def _build_public_url(request: Request) -> str:
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", ""))
    path = request.url.path
    if path.startswith("/api/og"):
        path = path[len("/api/og"):] or "/"
    if request.url.query:
        path = f"{path}?{request.url.query}"
    if host:
        return f"{scheme}://{host}{path}"
    return f"{request.base_url}".rstrip("/") + path


def _truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rstrip() + "..."


def _select_og_image(community_response) -> str | None:
    banner_url = None
    profile_url = None
    fallback_url = None
    for media in community_response.media:
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


def _build_community_html(community_response, request: Request) -> str:
    title = community_response.name or "Community"
    description = community_response.description or ""
    description = " ".join(description.split())
    description = _truncate(description, 220)
    og_image = _select_og_image(community_response)
    public_url = _build_public_url(request)
    site_name = "Nuspace"

    twitter_card = "summary_large_image" if og_image else "summary"

    def meta_tag(prop: str, content: str | None, name_attr: str = "property") -> str:
        if not content:
            return ""
        return f'<meta {name_attr}="{prop}" content="{escape(content, quote=True)}" />'

    meta_lines = [
        meta_tag("og:title", title),
        meta_tag("og:description", description),
        meta_tag("og:type", "website"),
        meta_tag("og:url", public_url),
        meta_tag("og:site_name", site_name),
        meta_tag("og:image", og_image),
        meta_tag("twitter:card", twitter_card, name_attr="name"),
        meta_tag("twitter:title", title, name_attr="name"),
        meta_tag("twitter:description", description, name_attr="name"),
        meta_tag("twitter:image", og_image, name_attr="name"),
    ]

    html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{escape(title)}</title>
    {''.join(meta_lines)}
  </head>
  <body>
    <h1>{escape(title)}</h1>
    <p>{escape(description)}</p>
    <p><a href="{escape(public_url, quote=True)}">View community</a></p>
  </body>
</html>
"""
    return html


@router.get("/og/communities", response_class=HTMLResponse, include_in_schema=False)
@router.get("/og/communities/", response_class=HTMLResponse, include_in_schema=False)
async def get_community_og_by_query(
    request: Request,
    id: int,
    user=Depends(get_creds_or_guest),
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
) -> HTMLResponse:
    community = await deps.community_exists_or_404(community_id=id, db_session=db_session)
    community_service = CommunityService(db_session=db_session)
    community_response = await community_service.get_community_response(
        infra=infra, community=community, user=user
    )
    if community_response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")

    html = _build_community_html(community_response, request)
    return HTMLResponse(content=html, status_code=status.HTTP_200_OK)
