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
from backend.modules.pages.constants import PageRole, PageSort
from backend.modules.pages.models.page import Page, PageVisibility
from backend.modules.pages.repository import _PAGE_SORT_COLUMNS, PageRepository
from backend.modules.pages.service import PageService
from sqlalchemy import select
from sqlalchemy.dialects import postgresql

SIGNED_IN = ({"sub": "owner"}, {"role": "user"})
GUEST = ({"sub": None, "is_guest": True}, {"role": "default", "is_guest": True})

# The SQL text of each whitelisted sort column. Read out of the whitelist
# rather than written out here, so adding a sort column is one edit and not two.
_PAGE_SORT_SQL = {sort: f"pages.{column.name}" for sort, column in _PAGE_SORT_COLUMNS.items()}


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
    role: PageRole | None = None,
    visibility: list[PageVisibility] | None = None,
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
                viewer_sub=viewer_sub,
                is_site_admin=is_site_admin,
                scope=scope,
                role=role,
                visibility=visibility,
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


# --- role filter ---------------------------------------------------------
#
# Written before the implementation, deliberately. This is the one bug the
# whole filter is dangerous about, and `b176a18` deleted the filter rather than
# fix it. The failure mode is not a crash: it is the same page showing up under
# both Role options, which a green suite does not catch.


def test_role_admin_excludes_pages_the_caller_owns() -> None:
    """`role=admin` is "administered by me AND NOT owned by me".

    Without the `NOT owner` clause a page the caller owns *and* administers
    satisfies both filters, and the user's table renders it twice — once under
    Owned, once under Where I'm an admin. That is the exact bug `b176a18`
    existed to end.
    """
    where = _where(scope="mine", role=PageRole.admin)

    assert "IS DISTINCT FROM" in where
    assert "page_admins" in where


def test_role_owner_and_role_admin_cannot_both_match_one_page() -> None:
    """The disjointness, stated as the pair rather than as one clause.

    `owner` is `pages.owner = me`; `admin` carries `IS DISTINCT FROM me` on the
    same column. Read together the two are mutually exclusive by construction,
    which is stronger than either clause being present: a future edit that drops
    the `admin` half fails here even if the `owner` half still looks right.
    """
    owner_where = _where(scope="mine", role=PageRole.owner)
    admin_where = _where(scope="mine", role=PageRole.admin)

    assert "pages.owner = 'owner'" in owner_where
    assert "pages.owner IS DISTINCT FROM 'owner'" in admin_where


def test_role_admin_treats_an_ownerless_page_as_not_owned() -> None:
    """`pages.owner` is nullable (`ON DELETE SET NULL`).

    `owner != me` is NULL for a NULL owner, and NULL is not true, so plain `!=`
    would silently hide a page the caller genuinely administers from the
    `Where I'm an admin` filter. `IS DISTINCT FROM` says "not you" for NULL,
    which is what "NOT owned by me" means.
    """
    conditions = PageRepository._list_conditions(
        viewer_sub="owner", is_site_admin=False, scope="mine", role=PageRole.admin
    )

    assert any("IS DISTINCT FROM" in str(condition) for condition in conditions)


def test_no_role_returns_both_relationships_and_nothing_else() -> None:
    """The default is the whole list. `role` narrows; it never widens."""
    where = _where(scope="mine")

    assert "IS DISTINCT FROM" not in where
    assert where == _where(scope="mine", role=None)


def test_the_role_filter_does_not_touch_the_directory() -> None:
    """`browsable` has no relationship to narrow, so it must not acquire one."""
    assert _where(scope="browsable", role=PageRole.owner) == _where(scope="browsable")


# --- visibility filter ---------------------------------------------------


def test_visibility_narrows_my_pages_and_is_absent_by_default() -> None:
    assert "visibility" not in _where(scope="mine")
    where = _where(scope="mine", visibility=[PageVisibility.private])
    assert "'private'" in where


def test_visibility_and_role_combine_by_and_not_by_or() -> None:
    """`?role=admin&visibility=private` is an intersection, not a union.

    If these two could be satisfied by different rows the filter would be
    describing "some page I administer OR some private page", which is a
    different question and an unanswerable total.
    """
    where = _where(scope="mine", role=PageRole.admin, visibility=[PageVisibility.private])

    # The scope's own two relationships are the only OR in the clause.
    assert where.count(" OR ") == 1
    assert where.count(" AND ") >= 3  # scope, role, not-owner, visibility


def test_visibility_still_never_reaches_the_directory() -> None:
    """The directory is a visibility question, so a visibility *filter* there
    would let a caller ask it a narrower question than it is meant to answer.

    Compared for equality rather than by substring: `browsable` legitimately
    carries a `visibility IN (...)` of its own — the public/internal
    restriction — so the clause is always there and only its contents are at
    stake.
    """
    assert _where(scope="browsable", visibility=[PageVisibility.private]) == _where(
        scope="browsable"
    )


# --- sort ----------------------------------------------------------------


def _order_by(
    *,
    scope: Literal["browsable", "mine"] = "mine",
    viewer_sub: str | None = "owner",
    sort: PageSort | None = None,
    order: Literal["asc", "desc"] = "desc",
) -> str:
    """The real ORDER BY of `list_pages`, as Postgres SQL.

    Calls `PageRepository._page_order_clauses` rather than restating it, for the
    same reason `_where` does.
    """
    return " ".join(
        (
            str(
                select(Page)
                .order_by(
                    *PageRepository._page_order_clauses(
                        viewer_sub=viewer_sub, scope=scope, sort=sort, order=order
                    )
                )
                .compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True})
            ).split("ORDER BY", 1)[1]
        ).split()
    )


def test_no_sort_preserves_the_existing_order_chain_exactly() -> None:
    """The chain the list has always had: the pages you own first, then
    image-first, then by name.

    Asserted literally rather than against a copy, because the failure being
    guarded against is precisely a copy: defaulting `sort` to `created_at` would
    reorder the table people already use, and the diff would be a one-word
    default nobody notices in review.
    """
    assert _order_by() == (
        "pages.owner = 'owner' DESC, "
        "(EXISTS (SELECT media.id FROM media "
        "WHERE media.entity_id = pages.id AND media.entity_type = 'pages')) DESC, "
        "pages.name ASC"
    )


def test_the_owner_first_prefix_belongs_to_the_default_chain_only() -> None:
    """The directory is not owner-grouped, so it has no such prefix at all — and
    an explicit `sort` must not gain one, or "sort by name" would quietly be
    "sort by name, owned first", which is not a name sort."""
    assert "pages.owner" not in _order_by(scope="browsable")
    assert "pages.owner" not in _order_by(sort=PageSort.name, order="asc")


@pytest.mark.parametrize("sort", list(PageSort), ids=lambda sort: sort.value)
@pytest.mark.parametrize("order", ["asc", "desc"], ids=["asc", "desc"])
def test_each_sort_column_answers_to_both_orders(
    sort: PageSort, order: Literal["asc", "desc"]
) -> None:
    column = _PAGE_SORT_SQL[sort]
    direction = "ASC" if order == "asc" else "DESC"

    assert f"{column} {direction}" in _order_by(sort=sort, order=order)


@pytest.mark.parametrize("sort", list(PageSort), ids=lambda sort: sort.value)
def test_every_sort_keeps_a_stable_tiebreaker(sort: PageSort) -> None:
    """`name` and `created_at` both repeat, and OFFSET pagination over a
    non-deterministic order drops and repeats rows across page boundaries."""
    assert "pages.id ASC" in _order_by(sort=sort)


def test_the_whitelist_covers_exactly_the_accepted_values() -> None:
    """`_PAGE_SORT_COLUMNS` and the `PageSort` enum are the two halves of one
    contract: FastAPI accepts the enum, the repository looks the column up by
    it. A key missing from the dict is a `KeyError` inside a coroutine, which
    surfaces as an unhandled 500 rather than the 422 the caller was promised —
    and a column missing from the enum is a sort the UI cannot reach.
    """
    assert set(_PAGE_SORT_COLUMNS) == set(PageSort)
