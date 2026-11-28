"""A profile's picture and banner over HTTP: the presigned flow, confirmed onto `users`.

`media.entity_id` is a bigint and cannot hold a Keycloak `sub`, so no `media`
row represents these. The upload is signed for `users` entity 0, the object name
carries the `sub`, and the confirm step writes `users.profile_picture` or
`users.profile_banner`. A custom picture replaces the sign-in avatar wherever
the person's picture is read.
"""

import pytest
from backend.modules.auth.models import User
from backend.modules.media.models import Media
from backend.tests.harness import Viewer
from sqlalchemy import select, update


async def _upload(viewer: Viewer, media_format: str) -> str:
    """Steps one and two as the browser sees them; the PUT to the bucket is not made."""
    response = await viewer.client.post(
        "/api/bucket/upload-url",
        json=[
            {
                "entity_type": "users",
                "entity_id": 0,
                "media_format": media_format,
                "media_order": 0,
                "mime_type": "image/png",
            }
        ],
    )
    assert response.status_code == 200
    return response.json()[0]["filename"]


async def _column(db, sub: str, column: str) -> str | None:
    async with db() as session:
        return (
            await session.execute(select(getattr(User, column)).where(User.sub == sub))
        ).scalar()


@pytest.mark.asyncio
async def test_confirming_a_picture_writes_the_users_column(db, member: Viewer) -> None:
    filename = await _upload(member, "profile")

    response = await member.client.put("/api/me/profile/picture", json={"filename": filename})

    assert response.status_code == 200
    assert await _column(db, member.sub, "profile_picture") == filename
    assert await _column(db, member.sub, "profile_banner") is None
    assert filename in response.json()["picture"]
    assert response.json()["banner"] is None


@pytest.mark.asyncio
async def test_confirming_a_banner_writes_the_users_column(db, member: Viewer) -> None:
    filename = await _upload(member, "banner")

    response = await member.client.put("/api/me/profile/banner", json={"filename": filename})

    assert response.status_code == 200
    assert await _column(db, member.sub, "profile_banner") == filename
    assert await _column(db, member.sub, "profile_picture") is None
    assert filename in response.json()["banner"]


@pytest.mark.asyncio
async def test_an_upload_leaves_no_media_row(db, member: Viewer) -> None:
    await _upload(member, "profile")

    async with db() as session:
        assert (await session.execute(select(Media))).first() is None


@pytest.mark.asyncio
async def test_the_custom_picture_replaces_the_sign_in_avatar_in_the_header(
    db, member: Viewer
) -> None:
    filename = await _upload(member, "profile")

    await member.client.put("/api/me/profile/picture", json={"filename": filename})

    picture = (await member.client.get("/api/me")).json()["user"]["picture"]
    assert filename in picture


@pytest.mark.asyncio
async def test_the_profile_page_shows_the_custom_picture_and_banner(
    member: Viewer, owner: Viewer
) -> None:
    await owner.client.patch(
        "/api/me/profile", json={"handle": "aigerim-b", "visibility": "public"}
    )
    picture = await _upload(owner, "profile")
    banner = await _upload(owner, "banner")
    await owner.client.put("/api/me/profile/picture", json={"filename": picture})
    await owner.client.put("/api/me/profile/banner", json={"filename": banner})

    body = (await member.client.get("/api/profiles/aigerim-b")).json()

    assert picture in body["picture"]
    assert banner in body["banner"]


@pytest.mark.asyncio
async def test_without_a_custom_picture_the_sign_in_avatar_shows(
    db, member: Viewer, owner: Viewer
) -> None:
    await owner.client.patch(
        "/api/me/profile", json={"handle": "aigerim-b", "visibility": "public"}
    )
    async with db.begin() as session:
        await session.execute(
            update(User).where(User.sub == owner.sub).values(picture="https://example.com/a.png")
        )

    body = (await member.client.get("/api/profiles/aigerim-b")).json()

    assert body["picture"] == "https://example.com/a.png"
    assert body["banner"] is None


@pytest.mark.asyncio
async def test_a_name_issued_to_someone_else_is_refused(
    db, member: Viewer, owner: Viewer
) -> None:
    theirs = await _upload(owner, "profile")

    response = await member.client.put("/api/me/profile/picture", json={"filename": theirs})

    assert response.status_code == 422
    assert await _column(db, member.sub, "profile_picture") is None


@pytest.mark.asyncio
async def test_a_banner_name_cannot_be_confirmed_as_a_picture(member: Viewer) -> None:
    banner = await _upload(member, "banner")

    response = await member.client.put("/api/me/profile/picture", json={"filename": banner})

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_an_unrelated_object_name_is_refused(member: Viewer) -> None:
    response = await member.client.put(
        "/api/me/profile/picture", json={"filename": "nuspace.kz/pages/1/profile/x"}
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_uploads_for_users_must_name_the_placeholder_entity(member: Viewer) -> None:
    response = await member.client.post(
        "/api/bucket/upload-url",
        json=[
            {
                "entity_type": "users",
                "entity_id": 7,
                "media_format": "profile",
                "media_order": 0,
                "mime_type": "image/png",
            }
        ],
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_a_guest_cannot_confirm_a_picture(guest: Viewer) -> None:
    response = await guest.client.put("/api/me/profile/picture", json={"filename": "x"})

    assert response.status_code == 401
