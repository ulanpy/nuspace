"""A Page's slug over HTTP: which slugs a Page may take, and renaming one.

Slugs sit at the root of `pages.nuspace.kz` (`/<slug>`), so a slug may not be a
path nginx answers itself on that host (`/api`, `/ws/`, `/assets/...`, a file
at the build root): a Page there would never be reached.
"""

import pytest
from backend.tests.harness import Viewer

SHADOWED_SLUGS = ["api", "ws", "assets", "favicon.ico", "index.html"]


@pytest.mark.asyncio
@pytest.mark.parametrize("slug", SHADOWED_SLUGS)
async def test_a_page_cannot_take_a_path_nginx_answers(member: Viewer, slug: str) -> None:
    response = await member.client.post("/api/pages", json={"name": "Shadowed", "slug": slug})

    assert response.status_code == 422
    assert (await member.client.get(f"/api/pages/{slug}")).status_code == 404


@pytest.mark.asyncio
async def test_a_slug_may_start_with_a_path_nginx_answers(member: Viewer) -> None:
    """nginx proxies `/api/`, not every path starting `/api`, so `api-club` is
    reachable (`tests/test_reserved_slugs.py` holds nginx to that)."""
    response = await member.client.post("/api/pages", json={"name": "API Club", "slug": "api-club"})

    assert response.status_code == 200
    assert (await member.client.get("/api/pages/api-club")).status_code == 200


@pytest.mark.asyncio
async def test_a_page_cannot_take_a_directory_at_the_build_root(member: Viewer) -> None:
    """`web/public/data/` is copied to the build root, so `/data` is a directory."""
    response = await member.client.post("/api/pages", json={"name": "Data", "slug": "data"})

    assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.parametrize("slug", ["api", "assets"])
async def test_a_page_cannot_be_renamed_to_a_path_nginx_answers(
    owner: Viewer, make_page, slug: str
) -> None:
    await make_page(owner=owner, slug="chess-club")

    response = await owner.client.patch("/api/pages/chess-club", json={"slug": slug})

    assert response.status_code == 422
    assert (await owner.client.get("/api/pages/chess-club")).status_code == 200


@pytest.mark.asyncio
async def test_a_rename_moves_the_page_and_leaves_nothing_behind(
    guest: Viewer, owner: Viewer, make_page
) -> None:
    """No redirects: the old address is a plain 404 for everyone."""
    await make_page(owner=owner, slug="chess-club", name="Chess Club")

    renamed = await owner.client.patch("/api/pages/chess-club", json={"slug": "chess-society"})

    assert renamed.status_code == 200
    assert renamed.json()["slug"] == "chess-society"
    assert (await guest.client.get("/api/pages/chess-society")).json()["name"] == "Chess Club"
    assert (await guest.client.get("/api/pages/chess-club")).status_code == 404


@pytest.mark.asyncio
async def test_a_rename_breaks_the_admin_invite_link(
    owner: Viewer, member: Viewer, make_page
) -> None:
    """The invite link names the slug, so after a rename it points at nothing."""
    await make_page(owner=owner, slug="chess-club")
    link = (await owner.client.get("/api/pages/chess-club/admin-link")).json()["url"]
    assert link.startswith("https://pages.nuspace.kz/chess-club?admin=")

    await owner.client.patch("/api/pages/chess-club", json={"slug": "chess-society"})

    assert (await member.client.get("/api/pages/chess-club")).status_code == 404
