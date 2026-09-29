"""`GET /pages` is the list behind `/mynuspace` and the My Pages table, and it was
the one read path with no test at all — so it shipped 500-ing on every caller.

Two bugs, both in the same call: the service asked the policy to check a
visibility it had no page for, and the repository ANDed its two visibility
alternatives together, so a signed-in viewer saw only their own pages. The
detail read is covered by `test_page_visibility`; this is the list's half of
the promise that a list and a detail read agree.
"""

from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Literal
from unittest.mock import MagicMock

import pytest
from backend.modules.pages.models.page import Page, PageVisibility
from backend.modules.pages.repository import PageRepository
from backend.modules.pages.service import PageService
from sqlalchemy import select
from sqlalchemy.dialects import postgresql

SIGNED_IN = ({"sub": "owner"}, {"role": "user"})
GUEST = ({"sub": None, "is_guest": True}, {"role": "default", "is_guest": True})


def _page(slug: str = "club") -> SimpleNamespace:
    return SimpleNamespace(
        id=7,
        name="Test",
        description=None,
        visibility=PageVisibility.public,
        owner="owner",
        slug=slug,
        page_content={},
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        owner_user=None,
    )


def _list_service(pages: list | None = None):
    repo = MagicMock(spec=PageRepository)
    repo.admin_page_ids = _async_return(set())
    repo.list_pages = _async_return((pages if pages is not None else [], 0, False))
    repo.list_media = _async_return([])

    uow = MagicMock()
    uow.get_repo = MagicMock(return_value=repo)
    uow.__aenter__ = _async_return(None)
    uow.__aexit__ = _async_return(False)

    async def _map_to_resources(*_args, **_kwargs):
        return [[] for _ in (pages or [])]

    infra = MagicMock(meilisearch_client=MagicMock())
    return (
        PageService(
            uow=uow, media_attachment_resolver=MagicMock(map_to_resources=_map_to_resources)
        ),
        infra,
        repo,
    )


def _async_return(value):
    async def _call(*_args, **_kwargs):
        return value

    return _call


@pytest.mark.asyncio
@pytest.mark.parametrize("viewer", [SIGNED_IN, GUEST], ids=["signed_in", "guest"])
async def test_a_list_answers_instead_of_dereferencing_a_page_it_does_not_have(
    viewer: tuple[dict, dict],
) -> None:
    """The regression: the list service called `check_permission(READ)` with no page,
    and the READ branch checks visibility of whatever it was handed — which was
    `None`, on the first query of every list request, for every viewer."""
    service, infra, _repo = _list_service([_page()])

    result = await service.list_browsable_pages(
        infra=infra, user=viewer, page=1, size=24, keyword=None
    )

    assert result.total == 0
    assert [item.slug for item in result.items] == ["club"]


def _where(
    *,
    scope: Literal["browsable", "mine"] = "browsable",
    viewer_sub: str | None = "owner",
    is_site_admin: bool = False,
) -> str:
    """The real WHERE of `list_pages`, as Postgres SQL.

    Calls `PageRepository._list_conditions` rather than restating it. An
    earlier version of this file reimplemented the condition, so the tests
    proved a copy matched a copy while the repository ran something else —
    which is how `func.or_` shipped. `literal_binds` inlines the bound values,
    so they can be asserted on in the text.
    """
    compiled = str(
        select(Page)
        .where(
            *PageRepository._list_conditions(
                viewer_sub=viewer_sub, is_site_admin=is_site_admin, scope=scope
            )
        )
        .compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True})
    )
    # Only the WHERE. The SELECT list names `pages.owner` on every row, so
    # without this split every assertion would match the projection instead.
    return compiled.split("WHERE", 1)[1]


def test_the_directory_never_lists_a_private_page_even_for_its_owner() -> None:
    """`GET /pages` is the public directory behind `/mynuspace`.

    Asserted on the visibility values, and on the absence of both `owner` and
    `page_admins`: this list is chosen by visibility alone, and a `private`
    page reaches a list only through a relationship alternative."""
    where = _where(scope="browsable")

    assert "owner" not in where
    assert "page_admins" not in where
    assert "'public'" in where and "'internal'" in where


def test_my_pages_is_the_two_relationships_and_nothing_else() -> None:
    """`GET /pages/mine` is "pages I run", so the WHERE is exactly the two
    relationships ORed together.

    No visibility clause, and that is the point: every visibility belongs in
    the list you manage your pages in, `private` most of all. An earlier
    version mixed a visibility OR in here, and since that OR contained
    `owner = me` the admin-only variant answered with owned pages too — the
    same row under both tabs."""
    where = _where(scope="mine")

    assert " OR " in where
    assert "owner" in where and "page_admins" in where
    assert "visibility" not in where


def test_every_list_compiles_to_real_sql() -> None:
    """The regression: the admin branch joined its alternatives with
    `func.or_`, which compiles to a call to a Postgres function named `or` —
    which does not exist, so the query was a syntax error. Only compiling to
    the real dialect can see this; the expression tree looks reasonable."""
    for scope in ("browsable", "mine"):
        assert " or(" not in _where(scope=scope), scope


def test_a_guest_gets_public_only() -> None:
    where = _where(scope="browsable", viewer_sub=None)

    assert "'public'" in where
    assert "'internal'" not in where and "OR" not in where


def test_a_site_admin_gets_no_restriction_on_the_directory() -> None:
    assert (
        PageRepository._list_conditions(viewer_sub="root", is_site_admin=True, scope="browsable")
        == []
    )


def test_a_site_admin_still_gets_only_their_own_pages_on_my_pages() -> None:
    """The site-admin bypass relaxes who may *read* a page. It says nothing
    about which pages you *run*, so it must not widen this list into every
    page on campus — that is what an unfiltered `browsable` rule here would
    do."""
    where = _where(scope="mine", viewer_sub="root", is_site_admin=True)

    assert "page_admins" in where
