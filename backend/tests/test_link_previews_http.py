"""What a link-preview bot is handed for a path a host owns, through the real app.

nginx sends the bot's request to `/api/og<path>` with the host's own `Host`
header. The endpoint that answers builds the card from one builder
(`common/og.py`): a specific card where one exists (an event at
`events.nuspace.kz/<id>`, a Page by id), the generic one otherwise. It is never
an error body, and the canonical URL is the host the bot asked.
"""

import re
from datetime import timedelta

import pytest

from backend.common.datetime_utils import utc_now
from backend.modules.events.models import (
    Event,
    EventStatus,
    EventType,
    RegistrationPolicy,
)
from backend.modules.pages.models import PageVisibility
from backend.tests.harness import VIEWER_KINDS, Viewer

EVENTS = {"host": "events.nuspace.kz"}


def meta(html: str, prop: str) -> str | None:
    found = re.search(rf'<meta (?:property|name)="{re.escape(prop)}" content="([^"]*)"', html)
    return found.group(1) if found else None


@pytest.fixture
def make_event(db, owner: Viewer):
    async def _make_event(
        *, name: str = "Hack Night", status: EventStatus = EventStatus.approved
    ) -> Event:
        start = utc_now() + timedelta(days=3)
        async with db.begin() as session:
            event = Event(
                creator_sub=owner.sub,
                policy=RegistrationPolicy.open,
                name=name,
                place="C3 atrium",
                start_datetime=start,
                end_datetime=start + timedelta(hours=2),
                description="Build   something\nin one night.",
                type=EventType.academic,
                status=status,
            )
            session.add(event)
            await session.flush()
        return event

    return _make_event


@pytest.mark.asyncio
async def test_an_event_card_reads_the_id_from_the_path(guest: Viewer, make_event) -> None:
    event = await make_event()

    response = await guest.client.get(f"/api/og/{event.id}", headers=EVENTS)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert meta(response.text, "og:title") == "Hack Night"
    assert meta(response.text, "og:description") == "Build something in one night."
    assert meta(response.text, "og:type") == "event"
    assert meta(response.text, "og:site_name") == "Nuspace"
    assert meta(response.text, "og:url") == f"https://events.nuspace.kz/{event.id}"


@pytest.mark.asyncio
async def test_the_old_query_string_endpoint_is_gone(guest: Viewer, make_event) -> None:
    event = await make_event()

    response = await guest.client.get("/api/og/events", params={"id": event.id}, headers=EVENTS)

    assert "Hack Night" not in response.text


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", VIEWER_KINDS)
async def test_an_event_nobody_may_read_gets_the_generic_card(
    viewers: dict[str, Viewer], make_event, kind: str
) -> None:
    """A pending event is its creator's and an admin's; to anyone else it is just
    a path, so the card neither errors nor confirms the event exists."""
    event = await make_event(name="Secret Plans", status=EventStatus.pending)

    response = await viewers[kind].client.get(f"/api/og/{event.id}", headers=EVENTS)

    assert response.status_code == 200
    assert ("Secret Plans" in response.text) == (kind in ("owner", "site_admin"))
    if "Secret Plans" not in response.text:
        assert meta(response.text, "og:title") == "Nuspace"


@pytest.mark.asyncio
async def test_a_missing_event_gets_the_generic_card(guest: Viewer) -> None:
    response = await guest.client.get("/api/og/999999", headers=EVENTS)

    assert response.status_code == 200
    assert meta(response.text, "og:site_name") == "Nuspace"
    assert meta(response.text, "og:url") == "https://events.nuspace.kz/999999"


@pytest.mark.asyncio
async def test_an_events_root_is_the_generic_card(guest: Viewer) -> None:
    response = await guest.client.get("/api/og/", headers=EVENTS)

    assert response.status_code == 200
    assert meta(response.text, "og:title") == "Nuspace"
    assert meta(response.text, "og:url") == "https://events.nuspace.kz/"


@pytest.mark.asyncio
async def test_a_number_is_an_event_only_on_the_events_host(guest: Viewer, make_event) -> None:
    """On `pages.` a numeric path is a slug, so it must not show an event."""
    event = await make_event()

    response = await guest.client.get(f"/api/og/{event.id}", headers={"host": "pages.nuspace.kz"})

    assert response.status_code == 200
    assert "Hack Night" not in response.text
    assert meta(response.text, "og:url") == f"https://pages.nuspace.kz/{event.id}"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("path", "host", "title"),
    [
        ("/api/og/", "nuspace.kz", "Nuspace"),
        ("/api/og/about", "nuspace.kz", "About"),
        ("/api/og/privacy-policy", "nuspace.kz", "Privacy Policy"),
        ("/api/og/courses/audit", "courses.nuspace.kz", "Audit"),
        ("/api/og/chess-club", "pages.nuspace.kz", "Chess Club"),
        ("/api/og/p/chess-club/settings", "nuspace.kz", "Settings"),
        ("/api/og/u/aiza", "my.nuspace.kz", "Aiza"),
        ("/api/og/42/", "opportunities.nuspace.kz", "Nuspace"),
    ],
)
async def test_any_other_owned_path_gets_a_generic_card(
    guest: Viewer, path: str, host: str, title: str
) -> None:
    response = await guest.client.get(path, headers={"host": host})

    assert response.status_code == 200
    assert meta(response.text, "og:title") == title
    assert meta(response.text, "og:site_name") == "Nuspace"
    assert meta(response.text, "og:url") == f"https://{host}{path.removeprefix('/api/og')}"
    assert meta(response.text, "twitter:card") == "summary"


@pytest.mark.asyncio
async def test_a_path_is_escaped_into_the_card(guest: Viewer) -> None:
    response = await guest.client.get("/api/og/%22%3E%3Cscript%3Ex%3C/script%3E")

    assert response.status_code == 200
    assert "<script>" not in response.text


@pytest.mark.asyncio
async def test_the_canonical_url_never_repeats_the_query_string(guest: Viewer) -> None:
    """An admin-invite link is `pages.nuspace.kz/<slug>?admin=<token>`."""
    response = await guest.client.get(
        "/api/og/chess-club", params={"admin": "s3cret"}, headers={"host": "pages.nuspace.kz"}
    )

    assert "s3cret" not in response.text
    assert meta(response.text, "og:url") == "https://pages.nuspace.kz/chess-club"


@pytest.mark.asyncio
async def test_the_canonical_host_cannot_be_forged(guest: Viewer, make_event) -> None:
    event = await make_event()

    forged_host = await guest.client.get(f"/api/og/{event.id}", headers={"host": "evil.example"})
    forwarded = await guest.client.get(
        f"/api/og/{event.id}", headers={**EVENTS, "x-forwarded-host": "evil.example"}
    )

    assert meta(forged_host.text, "og:url") == f"https://nuspace.kz/{event.id}"
    assert "Hack Night" not in forged_host.text
    assert meta(forwarded.text, "og:url") == f"https://events.nuspace.kz/{event.id}"


@pytest.mark.asyncio
async def test_a_page_card_names_the_requesting_host(
    guest: Viewer, owner: Viewer, make_page
) -> None:
    page = await make_page(owner=owner, slug="chess-club", name="Chess Club")

    response = await guest.client.get(
        "/api/og/pages", params={"id": page.id}, headers={"host": "pages.nuspace.kz"}
    )

    assert response.status_code == 200
    assert meta(response.text, "og:title") == "Chess Club"
    assert meta(response.text, "og:url") == "https://pages.nuspace.kz/p/chess-club"


@pytest.mark.asyncio
async def test_a_hidden_page_by_id_is_still_a_404(guest: Viewer, owner: Viewer, make_page) -> None:
    page = await make_page(owner=owner, visibility=PageVisibility.private, name="Chess Club")

    response = await guest.client.get("/api/og/pages", params={"id": page.id})

    assert response.status_code == 404
    assert "Chess Club" not in response.text


@pytest.mark.asyncio
async def test_a_path_that_is_only_called_pages_is_a_generic_card(guest: Viewer) -> None:
    response = await guest.client.get("/api/og/pages", headers={"host": "my.nuspace.kz"})

    assert response.status_code == 200
    assert meta(response.text, "og:title") == "Pages"
