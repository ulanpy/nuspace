from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.modules.auth.models import User
from backend.modules.pages.constants import PageAdminSort
from backend.modules.pages.models.page import PageAdmin
from backend.modules.pages.repository import PageRepository
from backend.modules.pages.service import PageService
from sqlalchemy import select
from sqlalchemy.dialects import postgresql

USER = ({"sub": "viewer"}, {"role": "user"})
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


def _service(total: int, returned: int) -> tuple[PageService, MagicMock]:
    repo = MagicMock(spec=PageRepository)
    repo.get_by_slug = _async_return(SimpleNamespace(id=7, owner="owner", slug="club"))
    repo.is_admin = _async_return(True)
    repo.list_admins_page = AsyncMock(
        return_value=([_admin(f"a{i}", i) for i in range(returned)], total)
    )

    uow = MagicMock()
    uow.get_repo = MagicMock(return_value=repo)
    uow.__aenter__ = _async_return(None)
    uow.__aexit__ = _async_return(False)
    return PageService(uow=uow, media_attachment_resolver=MagicMock()), repo


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

    repo.list_admins_page.assert_awaited_once_with(
        7, page=1, size=2, exclude_sub=None, sort=None, order="desc"
    )
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

    repo.list_admins_page.assert_awaited_once_with(
        7, page=1, size=10, exclude_sub="me", sort=None, order="desc"
    )
    assert result.total == 10
    assert result.has_next is False


@pytest.mark.asyncio
async def test_list_admins_forwards_sort_and_order():
    service, repo = _service(total=3, returned=3)

    await service.list_admins("club", USER, page=1, size=10, sort=PageAdminSort.name)

    repo.list_admins_page.assert_awaited_once_with(
        7, page=1, size=10, exclude_sub=None, sort=PageAdminSort.name, order="desc"
    )


def _admin_order(*, sort: PageAdminSort | None, order: str = "desc") -> str:
    """The real ORDER BY of `list_admins_page`, as Postgres SQL.

    Calls `PageRepository._admin_order_clauses` rather than restating it, for
    the reason `test_list_pages._where` does: a test that re-implements the
    query proves a copy matches a copy.
    """
    return str(
        select(PageAdmin)
        .join(User, PageAdmin.user_sub == User.sub)
        .order_by(*PageRepository._admin_order_clauses(sort=sort, order=order))
        .compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True})
    ).split("ORDER BY", 1)[1]


def test_the_admins_tiebreaker_survives_every_sort() -> None:
    for sort in (None, PageAdminSort.name, PageAdminSort.created_at):
        for order in ("asc", "desc"):
            order_by = _admin_order(sort=sort, order=order)
            assert "page_admins.user_sub ASC" in order_by, (sort, order)


def test_admins_sort_by_name_orders_the_joined_user_column() -> None:
    """`name` is on `users`, not on `page_admins` — which is why this list
    needs the join and why `created_at` alone was never a full sort."""
    assert "users.name DESC" in _admin_order(sort=PageAdminSort.name)
    assert "users.name ASC" in _admin_order(sort=PageAdminSort.name, order="asc")


def test_no_admins_sort_keeps_the_created_at_order() -> None:
    """Same rule as `list_pages`: an absent `sort` must leave the existing
    order chain exactly as it was, or every admin table silently reorders for
    everyone who did not ask for it."""
    order_by = _admin_order(sort=None)

    assert "page_admins.created_at ASC" in order_by
