"""People are findable in search when their profile allows it (#440).

A profile is a Source of kind `profile`, found by name, handle and department,
and read through the one visibility predicate: `public` for anyone, `internal`
for members, `private` for its person (and site admins). Its free-form content
is never indexed. Profiles are written over HTTP, as production writes them, and
read back over HTTP.
"""

from collections.abc import Awaitable, Callable

import pytest
from backend.modules.auth.models import User
from backend.modules.sgotinish.models import Department
from backend.tests.harness import Viewer
from fastapi import FastAPI
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

Settled = Callable[[], Awaitable[None]]

DEPARTMENT = "Zoology Institute Test"


async def _search_people(viewer: Viewer, q: str) -> set[str]:
    response = await viewer.client.get(
        "/api/search/results", params={"q": q, "kind": "profile"}
    )
    assert response.status_code == 200, response.text
    return {result["id"] for result in response.json()["results"]}


@pytest.fixture
def owner_in_department(db: async_sessionmaker[AsyncSession], owner: Viewer):
    """The owner belongs to a department. Set before the profile is written:
    the index is written with the profile, and nothing re-indexes a department change."""

    async def _assign() -> None:
        async with db.begin() as session:
            department = Department(name=DEPARTMENT)
            session.add(department)
            await session.flush()
            await session.execute(
                update(User).where(User.sub == owner.sub).values(department_id=department.id)
            )

    return _assign


async def _write_profile(viewer: Viewer, handle: str, visibility: str) -> None:
    response = await viewer.client.patch(
        "/api/me/profile", json={"handle": handle, "visibility": visibility}
    )
    assert response.status_code == 200, response.text


@pytest.mark.asyncio
async def test_a_public_profile_is_found_by_name_handle_and_department(
    guest: Viewer,
    owner: Viewer,
    owner_in_department,
    search_settled: Settled,
) -> None:
    await owner_in_department()
    await _write_profile(owner, "quokka-owner", "public")
    await search_settled()

    expected = {f"profile:{owner.sub}"}
    assert await _search_people(guest, "Owner") == expected
    assert await _search_people(guest, "quokka-owner") == expected
    assert await _search_people(guest, "Zoology") == expected


@pytest.mark.asyncio
async def test_a_public_profile_result_links_to_its_profile_page(
    guest: Viewer, owner: Viewer, search_settled: Settled
) -> None:
    await _write_profile(owner, "quokka-owner", "public")
    await search_settled()

    response = await guest.client.get(
        "/api/search/results", params={"q": "quokka", "kind": "profile"}
    )
    [result] = response.json()["results"]

    assert result["kind"] == "profile"
    assert result["url"] == "https://my.nuspace.kz/u/quokka-owner"
    assert result["visibility"] is None


@pytest.mark.asyncio
async def test_an_internal_profile_is_found_only_by_members(
    guest: Viewer,
    member: Viewer,
    banned_member: Viewer,
    owner: Viewer,
    site_admin: Viewer,
    search_settled: Settled,
) -> None:
    await _write_profile(owner, "quokka-owner", "internal")
    await search_settled()

    expected = {f"profile:{owner.sub}"}
    assert await _search_people(member, "Owner") == expected
    assert await _search_people(site_admin, "Owner") == expected
    assert await _search_people(owner, "Owner") == expected
    assert await _search_people(guest, "Owner") == set()
    # A ban removes member access, as it does for every `internal` read.
    assert await _search_people(banned_member, "Owner") == set()


@pytest.mark.asyncio
async def test_a_private_profile_is_found_by_its_person_and_no_one_else(
    guest: Viewer,
    member: Viewer,
    banned_member: Viewer,
    owner: Viewer,
    search_settled: Settled,
) -> None:
    await _write_profile(owner, "quokka-owner", "private")
    await search_settled()

    expected = {f"profile:{owner.sub}"}
    assert await _search_people(owner, "Owner") == expected
    assert await _search_people(guest, "Owner") == set()
    assert await _search_people(member, "Owner") == set()
    assert await _search_people(banned_member, "Owner") == set()


@pytest.mark.asyncio
async def test_a_profile_without_a_handle_is_not_a_source(
    guest: Viewer, owner: Viewer, search_settled: Settled
) -> None:
    # Public, but no handle: there is no profile page to open, so no result.
    response = await owner.client.patch("/api/me/profile", json={"visibility": "public"})
    assert response.status_code == 200, response.text
    await search_settled()

    assert await _search_people(guest, "Owner") == set()


@pytest.mark.asyncio
async def test_profile_content_is_not_searchable(
    guest: Viewer, owner: Viewer, search_settled: Settled
) -> None:
    await _write_profile(owner, "quokka-owner", "public")
    design = {"content": [{"type": "Heading", "props": {"id": "h", "text": "axolotl"}}]}
    await owner.client.put("/api/me/profile/content", json={"content": design})
    await search_settled()

    assert await _search_people(guest, "axolotl") == set()
    assert await _search_people(guest, "Owner") == {f"profile:{owner.sub}"}
