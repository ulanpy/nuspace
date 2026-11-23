"""Text inside a Page's blocks is searchable once it is saved (#439).

The editor walks the Puck document and sends the text it found as `content_text`
with `page_content`. A Page is written over HTTP, as production writes it, and
found over HTTP.
"""

from collections.abc import Awaitable, Callable

import pytest
from backend.tests.harness import Viewer

Settled = Callable[[], Awaitable[None]]

PHRASE = "quokkas gather on Fridays"


async def _search_pages(viewer: Viewer, q: str) -> set[str]:
    response = await viewer.client.get("/api/search/results", params={"q": q, "kind": "page"})
    assert response.status_code == 200, response.text
    return {result["id"] for result in response.json()["results"]}


@pytest.mark.asyncio
async def test_a_phrase_from_a_page_body_is_found_after_the_page_is_created(
    guest: Viewer, owner: Viewer, search_settled: Settled
) -> None:
    created = await owner.client.post(
        "/api/pages",
        json={"name": "Wildlife Club", "slug": "wildlife-club", "content_text": PHRASE},
    )
    assert created.status_code in (200, 201), created.text
    await search_settled()

    assert await _search_pages(guest, "quokkas") == {f"page:{created.json()['id']}"}


@pytest.mark.asyncio
async def test_a_phrase_added_by_a_save_is_found_and_a_removed_one_is_not(
    guest: Viewer, owner: Viewer, search_settled: Settled
) -> None:
    created = await owner.client.post(
        "/api/pages", json={"name": "Wildlife Club", "slug": "wildlife-club"}
    )
    assert created.status_code in (200, 201), created.text
    page_id = created.json()["id"]
    await search_settled()
    assert await _search_pages(guest, "quokkas") == set()

    saved = await owner.client.patch(
        "/api/pages/wildlife-club",
        json={"page_content": {"content": []}, "content_text": PHRASE},
    )
    assert saved.status_code == 200, saved.text
    await search_settled()
    assert await _search_pages(guest, "quokkas") == {f"page:{page_id}"}

    resaved = await owner.client.patch("/api/pages/wildlife-club", json={"content_text": ""})
    assert resaved.status_code == 200, resaved.text
    await search_settled()
    assert await _search_pages(guest, "quokkas") == set()
