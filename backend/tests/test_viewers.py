"""Each viewer fixture is who it says it is, as the app itself sees them.

Asked through `GET /api/me`, which goes the whole way through the mock
Keycloak path: cookies in, principal resolved, app token issued from the
`users` row.
"""

import pytest

from backend.tests.harness import PERSONAS, Viewer


@pytest.mark.asyncio
async def test_the_guest_is_not_signed_in(guest: Viewer) -> None:
    response = await guest.client.get("/api/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_the_banned_member_is_refused(banned_member: Viewer) -> None:
    response = await banned_member.client.get("/api/me")

    assert response.status_code == 403
    assert response.json()["detail"] == "Your account has been banned"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("kind", "role"),
    [
        ("member", "default"),
        ("owner", "default"),
        ("page_admin", "default"),
        ("site_admin", "admin"),
    ],
)
async def test_a_signed_in_viewer_is_themselves(
    viewers: dict[str, Viewer], kind: str, role: str
) -> None:
    viewer = viewers[kind]

    response = await viewer.client.get("/api/me")

    assert response.status_code == 200
    user = response.json()["user"]
    assert user["sub"] == viewer.sub == PERSONAS[kind].sub
    assert user["role"] == role
