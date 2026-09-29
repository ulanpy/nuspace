"""`reassign_owner` is the one behaviour change the user asked for.

The outgoing owner used to simply lose the page. They now land in
`page_admins` first, so a handover does not lock the person who built the page
out of it.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.modules.pages.repository import PageRepository
from backend.modules.pages.service import PageService
from fastapi import HTTPException

OWNER = ({"sub": "old-owner"}, {"role": "user"})
NEW_OWNER = ({"sub": "new-owner"}, {"role": "user"})


def _async_return(value):
    async def _call(*_args, **_kwargs):
        return value

    return _call


def _page_stub(**overrides):
    """Just enough of a `Page` for `PageResponse` to validate against."""
    from datetime import datetime, timezone

    from backend.modules.pages.models.page import PageVisibility

    values = {
        "id": 7,
        "name": "Test",
        "description": None,
        "visibility": PageVisibility.public,
        "owner": "old-owner",
        "slug": "club",
        "page_content": {},
        "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "owner_user": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def _resolver():
    async def map_to_resources(*_args, **_kwargs):
        return [[]]

    return MagicMock(map_to_resources=map_to_resources)


def _service(*, owner="old-owner", is_new_owner_an_admin=False, new_owner_exists=True):
    page = _page_stub(owner=owner)
    repo = MagicMock(spec=PageRepository)
    repo.get_by_slug = _async_return(page)
    repo.is_admin = AsyncMock(return_value=is_new_owner_an_admin)
    repo.get_user_by_sub = _async_return(
        SimpleNamespace(sub="new-owner") if new_owner_exists else None
    )
    repo.promote_to_admin = AsyncMock(return_value=None)
    repo.remove_admin = AsyncMock(return_value=True)

    uow = MagicMock()
    uow.get_repo = MagicMock(return_value=repo)
    uow.__aenter__ = _async_return(None)
    uow.__aexit__ = _async_return(False)
    # The service re-reads the page to build the response; keep it cheap.
    repo.get_by_id = _async_return(page)
    repo.load_relations = _async_return(None)
    repo.list_media = _async_return([])
    return PageService(uow=uow, media_attachment_resolver=_resolver()), repo, page


@pytest.mark.asyncio
async def test_the_previous_owner_becomes_an_admin():
    service, repo, page = _service()

    await service.reassign_owner(
        infra=MagicMock(), slug="club", new_owner_sub="new-owner", user=OWNER
    )

    repo.promote_to_admin.assert_awaited_once_with(7, "old-owner")
    assert page.owner == "new-owner"


@pytest.mark.asyncio
async def test_promotion_happens_before_the_owner_is_swapped():
    """Order matters: promoting after the swap would promote nobody."""
    service, repo, page = _service()
    seen = {}

    async def _promote(page_id, sub):
        seen["owner_at_promote_time"] = page.owner

    repo.promote_to_admin = AsyncMock(side_effect=_promote)

    await service.reassign_owner(
        infra=MagicMock(), slug="club", new_owner_sub="new-owner", user=OWNER
    )

    assert seen["owner_at_promote_time"] == "old-owner"


@pytest.mark.asyncio
async def test_a_transfer_to_yourself_is_a_no_op():
    """Promoting yourself would write you into `page_admins` and make the owner
    an admin of their own page, which every other check treats as a contradiction."""
    service, repo, page = _service(owner="old-owner")

    await service.reassign_owner(
        infra=MagicMock(), slug="club", new_owner_sub="old-owner", user=OWNER
    )

    repo.promote_to_admin.assert_not_awaited()
    assert page.owner == "old-owner"


@pytest.mark.asyncio
async def test_the_new_owners_admin_row_is_dropped():
    service, repo, page = _service(is_new_owner_an_admin=True)

    await service.reassign_owner(
        infra=MagicMock(), slug="club", new_owner_sub="new-owner", user=OWNER
    )

    repo.remove_admin.assert_awaited_once_with(7, "new-owner")
    assert page.owner == "new-owner"


@pytest.mark.asyncio
async def test_an_unknown_target_user_is_a_404():
    service, repo, _ = _service(new_owner_exists=False)

    with pytest.raises(HTTPException) as exc_info:
        await service.reassign_owner(
            infra=MagicMock(), slug="club", new_owner_sub="nobody", user=OWNER
        )

    assert exc_info.value.status_code == 404
