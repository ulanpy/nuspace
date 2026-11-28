"""Link-preview cards: the one HTML builder every og endpoint renders through.

nginx sends a link-preview bot's request for a path a host owns to
`/api/og<path>` (the path is unchanged, so the events host's `/42` arrives as
`/api/og/42`). The endpoint that answers builds a `Card` and returns
`card_response(card)`. Any path without a specific card gets `generic_card`,
so a bot is never handed an error body for a path the host owns.
"""

import re
from collections.abc import Awaitable
from dataclasses import dataclass
from html import escape
from typing import TypeVar

from backend.common.request_url import request_app_base_url
from backend.core.configs.config import config
from fastapi import HTTPException, Request, status
from fastapi.responses import HTMLResponse

SITE_NAME = "Nuspace"
SITE_DESCRIPTION = "Nuspace is the NU student superapp: campus services in one place."

OG_PREFIX = "/api/og"

T = TypeVar("T")


@dataclass(frozen=True)
class Card:
    title: str
    description: str
    url: str
    image: str | None = None
    og_type: str = "website"
    link_text: str = "Open on Nuspace"


def truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rstrip() + "..."


def one_line(text: str, max_len: int) -> str:
    """Collapse whitespace and cap the length, for a description."""
    return truncate(" ".join(text.split()), max_len)


def render_card(card: Card) -> str:
    def meta_tag(prop: str, content: str | None, name_attr: str = "property") -> str:
        if not content:
            return ""
        return f'<meta {name_attr}="{prop}" content="{escape(content, quote=True)}" />'

    twitter_card = "summary_large_image" if card.image else "summary"
    meta_lines = [
        meta_tag("og:title", card.title),
        meta_tag("og:description", card.description),
        meta_tag("og:type", card.og_type),
        meta_tag("og:url", card.url),
        meta_tag("og:site_name", SITE_NAME),
        meta_tag("og:image", card.image),
        meta_tag("twitter:card", twitter_card, name_attr="name"),
        meta_tag("twitter:title", card.title, name_attr="name"),
        meta_tag("twitter:description", card.description, name_attr="name"),
        meta_tag("twitter:image", card.image, name_attr="name"),
    ]

    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{escape(card.title)}</title>
    {"".join(meta_lines)}
  </head>
  <body>
    <h1>{escape(card.title)}</h1>
    <p>{escape(card.description)}</p>
    <p><a href="{escape(card.url, quote=True)}">{escape(card.link_text)}</a></p>
  </body>
</html>
"""


def card_response(card: Card) -> HTMLResponse:
    return HTMLResponse(content=render_card(card))


def og_path(request: Request) -> str:
    """The path the bot asked for: the request's path without the `/api/og` prefix."""
    path = request.url.path
    if path.startswith(OG_PREFIX):
        path = path[len(OG_PREFIX) :]
    return path or "/"


def canonical_url(request: Request, path: str) -> str:
    """The address the card names: the request's own host (validated) plus `path`.

    The query string is left out on purpose: it can carry a secret, such as an
    admin-invite token, that a card must not repeat into a chat.
    """
    return request_app_base_url(request, config) + path


def title_from_path(path: str) -> str | None:
    """`/privacy-policy` -> `Privacy Policy`: the last segment that is words, not a number."""
    for segment in reversed([s for s in path.split("/") if s]):
        words = re.sub(r"[-_\s]+", " ", "".join(c for c in segment if c.isprintable())).strip()
        if words and not words.isdigit():
            return truncate(words.title(), 80)
    return None


async def readable(read: Awaitable[T]) -> T | None:
    """What `read` returns, or None when the viewer may not read the record.

    A record a viewer may not read has no card of its own: the caller falls back
    to the generic card, which is built from the path alone and so does not
    confirm the record exists.
    """
    try:
        return await read
    except HTTPException as exc:
        if exc.status_code not in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND):
            raise
        return None


def generic_card(request: Request) -> Card:
    """The card for a path with no specific one: site name, plus a title from the path."""
    path = og_path(request)
    title = title_from_path(path)
    return Card(
        title=title or SITE_NAME,
        description=f"{title} on {SITE_NAME}." if title else SITE_DESCRIPTION,
        url=canonical_url(request, path),
    )
