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
from unittest.mock import MagicMock

import pytest
from backend.modules.pages.models.page import Page, PageAdmin, PageVisibility
from backend.modules.pages.repository import PageRepository
from backend.modules.pages.service import PageService
from sqlalchemy import or_, select
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
async def test_list_pages_answers_instead_of_dereferencing_a_page_it_does_not_have(
    viewer: tuple[dict, dict],
) -> None:
    """The regression: `list_pages` called `check_permission(READ)` with no page,
    and the READ branch checks visibility of whatever it was handed — which was
    `None`, on the first query of every list request, for every viewer."""
    service, infra, _repo = _list_service([_page()])

    result = await service.list_pages(
        infra=infra, user=viewer, page=1, size=24, owner_sub=None, role=None, keyword=None
    )

    assert result.total == 0
    assert [item.slug for item in result.items] == ["club"]




def _where(
    *,
    role: str | None = None,
    owner_sub: str | None = None,
    include_private: bool = True,
    viewer_sub: str | None = "owner",
    is_site_admin: bool = False,
) -> str:
    """The real WHERE of `list_pages`, as Postgres SQL.

    Calls `PageRepository._list_conditions` rather than restating it. An
    earlier version of this file reimplemented the condition, so the tests
    proved a copy matched a copy while the repository ran something else —
    which is how `func.or_` shipped. `literal_binds` inlines the visibility
    values, so they can be asserted on in the text.
    """
    compiled = str(
        select(Page)
        .where(
            *PageRepository._list_conditions(
                viewer_sub=viewer_sub,
                is_site_admin=is_site_admin,
                owner_sub=owner_sub,
                role=role,
                include_private=include_private,
            )
        )
        .compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True})
    )
    # Only the WHERE. The SELECT list names `pages.owner` on every row, so
    # without this every assertion below would match the projection instead.
    return compiled.split("WHERE", 1)[1]


@pytest.mark.parametrize("role", ["owned", "admin", None], ids=["owned", "admin", "all"])
def test_every_role_filter_compiles_to_real_sql(role: str | None) -> None:
    """The regression: the admin branch joined its alternatives with
    `func.or_`, which compiles to a call to a Postgres function named `or` —
    which does not exist. `role=admin` 500'd and only that filter, while every
    other role was fine. Only compiling to the real dialect can see this; the
    expression tree looks perfectly reasonable."""
    assert " or(" not in _where(role=role)


def test_a_browse_never_lists_a_private_page_even_for_its_owner() -> None:
    """`/mynuspace` is a public directory, so it passes `include_private=False`
    and a private page stays out of the grid even for its owner.

    Asserted on `owner`, not on the string `private`: a private page reached
    the directory through the `owner = me` half of the visibility OR, and no
    `private` literal is named in the query either way."""
    where = _where(include_private=False)

    assert "owner" not in where
    assert "'public'" in where and "'internal'" in where


@pytest.mark.parametrize(
    ("role", "owner_sub"),
    [(None, None), ("owned", None), ("admin", None), (None, "owner")],
    ids=["all", "owned", "admin", "owner_sub_me"],
)
def test_every_my_pages_tab_still_lists_my_private_pages(
    role: str | None, owner_sub: str | None
) -> None:
    """The regression that undid the fix above.

    `include_private` was first derived from `role is not None or owner_sub is
    not None`, on the reasoning that an unscoped list is a browse. It is not:
    My Pages with no tab selected sends neither, and that tab is where a
    signed-in user looks for the private pages they made. The derivation
    emptied All of exactly what it exists to show while Owned and Admin kept
    working — a convincing-looking bug. All four call shapes are pinned so the
    flag stays explicit and cannot be re-inferred from a parameter that does not
    distinguish them.

    `OR`, not `AND`: the two alternatives went into the WHERE as separate
    conditions once already, and `.where()` ANDs, so a signed-in viewer saw
    public and internal pages only when they happened to own them."""
    where = _where(role=role, owner_sub=owner_sub)

    assert " OR " in where
    assert "owner" in where


def test_a_page_admin_reaches_private_pages_through_membership() -> None:
    """The admin is not the owner, so it is the `page_admins` alternative that
    lets their private pages through."""
    assert "page_admins" in _where(role="admin")


def test_a_guest_gets_public_only() -> None:
    where = _where(viewer_sub=None, include_private=False)

    assert "'public'" in where
    assert "'internal'" not in where and "OR" not in where


def test_a_site_admin_gets_no_restriction() -> None:
    assert PageRepository._list_conditions(
        viewer_sub="root", is_site_admin=True, owner_sub=None, role=None
    ) == []
