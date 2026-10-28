"""Who can read a Page, as a matrix over viewer kind × tier, through the real app.

`visible_to` (`modules/shared/visibility.py`) decides every cell, and every
path that reads a Page asks it: the read by slug, the OG preview by id, and the
directory. A Page the viewer may not read is a 404, never a 403, because a 403
tells a stranger the Page exists.

- `public`: everyone.
- `internal` ("Members only"): signed in and not banned.
- `private`: the owner, the Page's admins and site admins.
"""

import pytest
from backend.modules.pages.models import PageVisibility
from backend.tests.harness import VIEWER_KINDS, Viewer

READERS = {
    PageVisibility.public: set(VIEWER_KINDS),
    PageVisibility.internal: {"member", "owner", "page_admin", "site_admin"},
    PageVisibility.private: {"owner", "page_admin", "site_admin"},
}

MATRIX = [
    pytest.param(tier, kind, kind in READERS[tier], id=f"{tier.value}-{kind}")
    for tier in PageVisibility
    for kind in VIEWER_KINDS
]


@pytest.fixture
def club(viewers: dict[str, Viewer], make_page):
    async def _club(tier: PageVisibility):
        return await make_page(
            owner=viewers["owner"],
            admins=(viewers["page_admin"],),
            visibility=tier,
            slug="chess-club",
            name="Chess Club",
        )

    return _club


@pytest.mark.asyncio
@pytest.mark.parametrize(("tier", "kind", "reads"), MATRIX)
async def test_reading_a_page_by_slug(
    viewers: dict[str, Viewer], club, tier: PageVisibility, kind: str, reads: bool
) -> None:
    await club(tier)

    response = await viewers[kind].client.get("/api/pages/chess-club")

    if reads:
        assert response.status_code == 200
        assert response.json()["slug"] == "chess-club"
    else:
        assert response.status_code == 404
        assert response.json()["detail"] == "Page not found"


@pytest.mark.asyncio
@pytest.mark.parametrize(("tier", "kind", "reads"), MATRIX)
async def test_reading_a_page_preview_by_id(
    viewers: dict[str, Viewer], club, tier: PageVisibility, kind: str, reads: bool
) -> None:
    page = await club(tier)

    response = await viewers[kind].client.get("/api/og/pages", params={"id": page.id})

    if reads:
        assert response.status_code == 200
        assert "Chess Club" in response.text
    else:
        assert response.status_code == 404
        assert "Chess Club" not in response.text


# The directory lists by tier alone: a `private` Page is not a directory entry,
# not even for its owner or its admins, who find it under `/pages/mine`. Only a
# site admin, who reads every tier, sees it here.
LISTED = {
    PageVisibility.public: set(VIEWER_KINDS),
    PageVisibility.internal: READERS[PageVisibility.internal],
    PageVisibility.private: {"site_admin"},
}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("tier", "kind", "listed"),
    [
        pytest.param(tier, kind, kind in LISTED[tier], id=f"{tier.value}-{kind}")
        for tier in PageVisibility
        for kind in VIEWER_KINDS
    ],
)
async def test_the_directory(
    viewers: dict[str, Viewer], club, tier: PageVisibility, kind: str, listed: bool
) -> None:
    await club(tier)

    response = await viewers[kind].client.get("/api/pages")

    assert response.status_code == 200
    body = response.json()
    assert [item["slug"] for item in body["items"]] == (["chess-club"] if listed else [])
    # The count never includes a Page the viewer cannot open.
    assert body["total"] == (1 if listed else 0)


@pytest.mark.asyncio
@pytest.mark.parametrize(("tier", "kind", "reads"), MATRIX)
async def test_my_pages(
    viewers: dict[str, Viewer], club, tier: PageVisibility, kind: str, reads: bool
) -> None:
    """The pages a viewer runs, at every tier: only the owner and the Page's admins
    have this one in their list, and only a guest (a banned member included) is
    refused the list itself."""
    await club(tier)

    response = await viewers[kind].client.get("/api/pages/mine")

    if kind in ("guest", "banned_member"):
        assert response.status_code == 401
        return
    assert response.status_code == 200
    runs = kind in ("owner", "page_admin")
    assert [item["slug"] for item in response.json()["items"]] == (["chess-club"] if runs else [])


@pytest.mark.asyncio
async def test_a_banned_member_cannot_read_a_members_only_page(
    banned_member: Viewer, member: Viewer, owner: Viewer, make_page
) -> None:
    """A member reads `internal` and a banned member does not, and is told it is
    not there rather than that it is forbidden.

    Over HTTP `get_creds_or_guest` already reads a banned member as a guest, so
    this holds with or without the predicate's scope clause. The clause on its
    own is tested in `shared/tests/test_visibility.py` (ADR 0011)."""
    await make_page(owner=owner, slug="chess-club", visibility=PageVisibility.internal)

    assert (await member.client.get("/api/pages/chess-club")).status_code == 200
    response = await banned_member.client.get("/api/pages/chess-club")

    assert response.status_code == 404
    assert response.json()["detail"] == "Page not found"


MANAGEMENT = [
    pytest.param("GET", "/api/pages/chess-club/admins", None, id="list-admins"),
    pytest.param("GET", "/api/pages/chess-club/admin-link", None, id="admin-link"),
    pytest.param("PATCH", "/api/pages/chess-club", {"name": "Renamed"}, id="update"),
    pytest.param("DELETE", "/api/pages/chess-club", None, id="delete"),
    pytest.param("DELETE", "/api/pages/chess-club/admins/me", None, id="leave"),
]


@pytest.mark.asyncio
@pytest.mark.parametrize(("method", "path", "body"), MANAGEMENT)
@pytest.mark.parametrize(
    ("tier", "status"),
    [
        pytest.param(PageVisibility.private, 404, id="hidden"),
        pytest.param(PageVisibility.public, 403, id="visible"),
    ],
)
async def test_managing_a_page_you_cannot_read_is_not_found(
    member: Viewer,
    club,
    method: str,
    path: str,
    body: dict | None,
    tier: PageVisibility,
    status: int,
) -> None:
    """A member who runs nothing on the Page is refused every management action.
    On a Page they can read that is a 403. On one they cannot, it is the same 404
    a read gets, so the refusal does not confirm the Page exists."""
    await club(tier)

    response = await member.client.request(method, path, json=body)

    assert response.status_code == status
