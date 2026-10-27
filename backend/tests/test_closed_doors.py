import pytest

from backend.tests.harness import Viewer

EVIL_ORIGIN = "https://evil.example"


@pytest.mark.asyncio
async def test_a_foreign_origin_gets_no_cors_headers(member: Viewer) -> None:
    response = await member.client.get("/api/profile", headers={"Origin": EVIL_ORIGIN})

    assert "access-control-allow-origin" not in response.headers
    assert "access-control-allow-credentials" not in response.headers


@pytest.mark.asyncio
async def test_a_foreign_origin_preflight_gets_no_cors_headers(guest: Viewer) -> None:
    response = await guest.client.options(
        "/api/pages/chess-club",
        headers={
            "Origin": EVIL_ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert "access-control-allow-origin" not in response.headers
    assert "access-control-allow-credentials" not in response.headers
    assert "access-control-allow-methods" not in response.headers


@pytest.mark.asyncio
async def test_the_old_search_endpoint_is_gone(guest: Viewer) -> None:
    response = await guest.client.get(
        "/api/search/", params={"keyword": "a", "storage_name": "pages"}
    )

    assert response.status_code == 404
