"""Profile pages over HTTP: the settings a person keeps, and who reads `/u/<handle>`.

A profile page is three columns on `users` (`handle`, `profile_visibility`,
`profile_content`), not a row of its own. It exists only once a handle is set,
and a read by handle asks `visible_to` like a Page does: for a profile,
`private` means the person and site admins. Anything else is a 404.
"""

import pytest
from backend.modules.auth.models import User, UserRole
from backend.modules.pages.models import PageVisibility
from backend.modules.sgotinish.models import Department
from backend.tests.harness import VIEWER_KINDS, Viewer
from sqlalchemy import delete, update

# --- The viewer's own settings ---------------------------------------------------


@pytest.mark.asyncio
async def test_a_new_profile_is_private_with_no_handle(member: Viewer) -> None:
    response = await member.client.get("/api/me/profile")

    assert response.status_code == 200
    assert response.json() == {"handle": None, "visibility": "private", "content": None}


@pytest.mark.asyncio
async def test_a_guest_has_no_profile_settings(guest: Viewer) -> None:
    response = await guest.client.get("/api/me/profile")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_a_member_sets_a_handle_and_a_visibility(member: Viewer) -> None:
    response = await member.client.patch(
        "/api/me/profile", json={"handle": "aigerim-b", "visibility": "internal"}
    )

    assert response.status_code == 200
    assert response.json() == {"handle": "aigerim-b", "visibility": "internal", "content": None}
    assert (await member.client.get("/api/me/profile")).json()["handle"] == "aigerim-b"


@pytest.mark.asyncio
async def test_a_handle_someone_else_holds_is_a_conflict(member: Viewer, owner: Viewer) -> None:
    await owner.client.patch("/api/me/profile", json={"handle": "aigerim-b"})

    response = await member.client.patch("/api/me/profile", json={"handle": "aigerim-b"})

    assert response.status_code == 409
    assert (await member.client.get("/api/me/profile")).json()["handle"] is None


@pytest.mark.asyncio
async def test_saving_your_own_handle_again_is_not_a_conflict(member: Viewer) -> None:
    await member.client.patch("/api/me/profile", json={"handle": "aigerim-b"})

    response = await member.client.patch("/api/me/profile", json={"handle": "aigerim-b"})

    assert response.status_code == 200


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "handle",
    [
        # The account host's own words.
        "account",
        "pages",
        "profile",
        "people",
        # The slug list's.
        "admin",
        "sgotinish",
        # The slug rules.
        "Aigerim",
        "aigerim_b",
        "-aigerim",
        "ai",
        "a" * 51,
    ],
)
async def test_a_reserved_or_malformed_handle_is_refused(member: Viewer, handle: str) -> None:
    response = await member.client.patch("/api/me/profile", json={"handle": handle})

    assert response.status_code == 422
    assert (await member.client.get("/api/me/profile")).json()["handle"] is None


@pytest.mark.asyncio
async def test_a_renamed_handle_frees_the_old_one(member: Viewer, owner: Viewer) -> None:
    await owner.client.patch(
        "/api/me/profile", json={"handle": "aigerim-b", "visibility": "public"}
    )
    await owner.client.patch("/api/me/profile", json={"handle": "aigerim-bek"})

    # No redirect is kept: the old address is simply gone, and free.
    assert (await member.client.get("/api/profiles/aigerim-b")).status_code == 404
    assert (await member.client.get("/api/profiles/aigerim-bek")).status_code == 200
    claimed = await member.client.patch("/api/me/profile", json={"handle": "aigerim-b"})
    assert claimed.status_code == 200


@pytest.mark.asyncio
async def test_the_profile_design_is_saved_and_read_back(member: Viewer) -> None:
    design = {"content": [{"type": "Heading", "props": {"id": "h", "text": "About"}}], "root": {}}

    response = await member.client.put("/api/me/profile/content", json={"content": design})

    assert response.status_code == 200
    assert (await member.client.get("/api/me/profile")).json()["content"] == design


# --- Reading /u/<handle> -----------------------------------------------------------

# `owner` is the person whose profile it is: the record's only manager.
READERS = {
    PageVisibility.public: set(VIEWER_KINDS),
    PageVisibility.internal: {"member", "owner", "page_admin", "site_admin"},
    PageVisibility.private: {"owner", "site_admin"},
}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("tier", "kind", "reads"),
    [
        pytest.param(tier, kind, kind in READERS[tier], id=f"{tier.value}-{kind}")
        for tier in PageVisibility
        for kind in VIEWER_KINDS
    ],
)
async def test_reading_a_profile_by_handle(
    viewers: dict[str, Viewer], tier: PageVisibility, kind: str, reads: bool
) -> None:
    await viewers["owner"].client.patch(
        "/api/me/profile", json={"handle": "aigerim-b", "visibility": tier.value}
    )

    response = await viewers[kind].client.get("/api/profiles/aigerim-b")

    if reads:
        assert response.status_code == 200
        assert response.json()["handle"] == "aigerim-b"
        assert response.json()["can_edit"] == (kind == "owner")
    else:
        assert response.status_code == 404
        assert response.json() == {"detail": "Profile not found"}


@pytest.mark.asyncio
async def test_a_profile_is_private_until_its_person_chooses(
    viewers: dict[str, Viewer],
) -> None:
    await viewers["owner"].client.patch("/api/me/profile", json={"handle": "aigerim-b"})

    readers = {
        kind
        for kind, viewer in viewers.items()
        if (await viewer.client.get("/api/profiles/aigerim-b")).status_code == 200
    }

    assert readers == {"owner", "site_admin"}


@pytest.mark.asyncio
async def test_a_profile_with_no_handle_does_not_exist(site_admin: Viewer, owner: Viewer) -> None:
    await owner.client.patch("/api/me/profile", json={"visibility": "public"})
    await owner.client.put("/api/me/profile/content", json={"content": {"root": {}}})

    response = await site_admin.client.get(f"/api/profiles/{owner.sub}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_clearing_the_handle_takes_the_profile_down(member: Viewer, owner: Viewer) -> None:
    await owner.client.patch(
        "/api/me/profile", json={"handle": "aigerim-b", "visibility": "public"}
    )

    response = await owner.client.patch("/api/me/profile", json={"handle": None})

    assert response.json()["handle"] is None
    assert response.json()["visibility"] == "public"
    assert (await member.client.get("/api/profiles/aigerim-b")).status_code == 404


@pytest.mark.asyncio
async def test_the_identity_header_is_read_from_users_at_request_time(
    db, member: Viewer, owner: Viewer
) -> None:
    await owner.client.patch(
        "/api/me/profile", json={"handle": "aigerim-b", "visibility": "public"}
    )
    # A design that tries to restate the header changes nothing about it.
    design = {"content": [], "root": {"props": {"name": "Someone Else"}}}
    await owner.client.put("/api/me/profile/content", json={"content": design})
    # The account changes after the design was saved, as a sign-in sync or an
    # SG appointment would change it.
    async with db.begin() as session:
        department = Department(name="School of Engineering and Digital Sciences")
        session.add(department)
        await session.flush()
        await session.execute(
            update(User)
            .where(User.sub == owner.sub)
            .values(
                name="Aigerim",
                surname="Bekova",
                picture="https://example.com/a.png",
                role=UserRole.capo,
                department_id=department.id,
            )
        )

    body = (await member.client.get("/api/profiles/aigerim-b")).json()

    assert body == {
        "handle": "aigerim-b",
        "name": "Aigerim",
        "surname": "Bekova",
        "picture": "https://example.com/a.png",
        "department": "School of Engineering and Digital Sciences",
        "sg_role": "capo",
        "content": design,
        "can_edit": False,
    }


@pytest.mark.asyncio
async def test_no_sg_role_outside_student_government(member: Viewer, site_admin: Viewer) -> None:
    await site_admin.client.patch(
        "/api/me/profile", json={"handle": "the-admin", "visibility": "public"}
    )

    body = (await member.client.get("/api/profiles/the-admin")).json()

    assert body["sg_role"] is None
    assert body["department"] is None
    # The harness signs in with an empty picture, which is no picture.
    assert body["picture"] is None


@pytest.mark.asyncio
async def test_deleting_the_account_deletes_the_profile(
    db, make_page, member: Viewer, owner: Viewer
) -> None:
    """There is no profile row to leave behind: the account's row is the profile.

    There is no account-deletion endpoint; an account is deleted as a `users`
    row. The person also owns a Page with an admin, so the delete crosses the
    foreign keys a typical account carries, not just the profile's columns.
    """
    await make_page(owner=owner, admins=(member,), slug="chess-club")
    await owner.client.patch(
        "/api/me/profile", json={"handle": "aigerim-b", "visibility": "public"}
    )
    await owner.client.put("/api/me/profile/content", json={"content": {"root": {}}})
    assert (await member.client.get("/api/profiles/aigerim-b")).status_code == 200

    async with db.begin() as session:
        await session.execute(delete(User).where(User.sub == owner.sub))

    assert (await member.client.get("/api/profiles/aigerim-b")).status_code == 404
    # Nothing still holds the handle.
    claimed = await member.client.patch("/api/me/profile", json={"handle": "aigerim-b"})
    assert claimed.status_code == 200
