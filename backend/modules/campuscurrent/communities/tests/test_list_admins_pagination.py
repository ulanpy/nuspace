from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.modules.campuscurrent.communities.repository import CommunityRepository
from backend.modules.campuscurrent.communities.service import CommunityService

USER = ({"sub": "viewer"}, {"role": "user", "communities": []})
BASE = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _async_return(value):
    async def _call(*_args, **_kwargs):
        return value

    return _call


def _admin(sub: str, minute: int) -> SimpleNamespace:
    return SimpleNamespace(
        user_sub=sub,
        created_at=BASE + timedelta(minutes=minute),
        user=SimpleNamespace(name=f"Name{sub}", surname="Surname", picture=None),
    )


def _service(total: int, returned: int) -> tuple[CommunityService, MagicMock]:
    repo = MagicMock(spec=CommunityRepository)
    repo.get_by_slug = _async_return(SimpleNamespace(id=7, owner_user=SimpleNamespace(sub="owner")))
    repo.is_admin = _async_return(True)
    repo.list_admins_page = AsyncMock(
        return_value=([_admin(f"a{i}", i) for i in range(returned)], total)
    )

    uow = MagicMock()
    uow.get_repo = MagicMock(return_value=repo)
    uow.__aenter__ = _async_return(None)
    uow.__aexit__ = _async_return(False)
    return CommunityService(uow=uow, media_attachment_resolver=MagicMock()), repo


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("total", "page", "size", "returned", "total_pages", "has_next"),
    [
        (0, 1, 10, 0, 1, False),
        (1, 1, 10, 1, 1, False),
        (10, 1, 10, 10, 1, False),
        (11, 1, 10, 10, 2, True),
        (11, 2, 10, 1, 2, False),
        (85, 9, 10, 5, 9, False),
        (91, 9, 10, 10, 10, True),
    ],
)
async def test_list_admins_envelope(total, page, size, returned, total_pages, has_next):
    service, _ = _service(total, returned)

    result = await service.list_admins("club", USER, page=page, size=size)

    assert (result.total, result.page, result.size) == (total, page, size)
    assert (result.total_pages, result.has_next) == (total_pages, has_next)
    assert len(result.items) == returned


@pytest.mark.asyncio
async def test_list_admins_maps_rows_and_forwards_paging():
    service, repo = _service(total=3, returned=2)

    result = await service.list_admins("club", USER, page=1, size=2)

    repo.list_admins_page.assert_awaited_once_with(7, page=1, size=2, exclude_sub=None)
    assert [(i.sub, i.name, i.surname) for i in result.items] == [
        ("a0", "Namea0", "Surname"),
        ("a1", "Namea1", "Surname"),
    ]


@pytest.mark.asyncio
async def test_list_admins_forwards_exclude_sub_so_counts_stay_consistent():
    # The settings page pins the signed-in admin above the table. The exclusion
    # has to reach the COUNT query too, or the last page comes back empty.
    service, repo = _service(total=10, returned=10)

    result = await service.list_admins("club", USER, page=1, size=10, exclude_sub="me")

    repo.list_admins_page.assert_awaited_once_with(7, page=1, size=10, exclude_sub="me")
    assert result.total == 10
    assert result.has_next is False
