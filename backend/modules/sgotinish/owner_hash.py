"""Where an anonymous ticket's owner hash is read from.

`owner_hash` is the *only* credential guarding an anonymous ticket: whoever
holds it can read and post messages on that ticket. It was accepted solely as a
query parameter, which writes it into every access log that records a request
line -- nginx's default format does, verbatim -- along with any proxy, CDN or
backup that touches those logs.

That undoes what the anonymity design is for. Ticket rows deliberately store no
`author_sub`, and then the key to the ticket was being copied into plaintext
logs on every poll for new messages.

Reading it from a header instead keeps it out of request lines and out of
`Referer`. The query parameter still works so the existing frontend and any
anonymous link already in circulation keep functioning; the header takes
precedence, and new clients should send only the header.
"""

from typing import Annotated

from fastapi import Header, Query

OWNER_HASH_HEADER = "X-Owner-Hash"


async def get_owner_hash(
    x_owner_hash: Annotated[str | None, Header(alias=OWNER_HASH_HEADER)] = None,
    owner_hash: Annotated[str | None, Query()] = None,
) -> str | None:
    """The anonymous owner hash, preferring the header over the query string."""
    return x_owner_hash or owner_hash
