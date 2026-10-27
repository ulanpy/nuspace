"""Reading a Page over HTTP: the worked example of the harness (tests/README.md).

The viewer × tier matrix itself still lives in `test_page_visibility.py`,
against `PagePolicy`. These drive `GET /api/pages/{slug}` through the real
app and the real database instead.
"""

import pytest
from backend.modules.pages.models import PageVisibility
from backend.tests.harness import VIEWER_KINDS, Viewer


@pytest.mark.asyncio
async def test_a_guest_reads_a_public_page(guest: Viewer, owner: Viewer, make_page) -> None:
    await make_page(owner=owner, slug="chess-club", name="Chess Club")

    response = await guest.client.get("/api/pages/chess-club")

    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "chess-club"
    assert body["name"] == "Chess Club"
    assert body["visibility"] == "public"
    assert body["owner_user"]["sub"] == owner.sub
    assert body["permissions"]["can_edit"] is False


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", VIEWER_KINDS)
async def test_every_viewer_reads_a_public_page(
    viewers: dict[str, Viewer], kind: str, make_page
) -> None:
    await make_page(
        owner=viewers["owner"],
        admins=(viewers["page_admin"],),
        slug="chess-club",
    )

    response = await viewers[kind].client.get("/api/pages/chess-club")

    assert response.status_code == 200
    assert response.json()["slug"] == "chess-club"


@pytest.mark.asyncio
async def test_a_private_page_is_not_found_for_a_guest(
    guest: Viewer, owner: Viewer, make_page
) -> None:
    await make_page(owner=owner, slug="chess-club", visibility=PageVisibility.private)

    response = await guest.client.get("/api/pages/chess-club")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_an_unknown_slug_is_not_found(guest: Viewer) -> None:
    response = await guest.client.get("/api/pages/no-such-page")

    assert response.status_code == 404
