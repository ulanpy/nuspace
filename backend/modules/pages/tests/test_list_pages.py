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


def _list_where(
    *,
    role: str | None,
    owner_sub: str | None = None,
    viewer_sub: str | None = "owner",
    is_site_admin: bool = False,
) -> str:
    """The real `WHERE` of `PageRepository.list_pages`, compiled to Postgres SQL.

    Calls `PageRepository._list_conditions` — the same method `list_pages`
    calls. This helper used to reimplement the condition, which made the whole
    file useless as a check: a green run proved the copy matched the copy, not
    the query Postgres got. Verified by flipping the flag under the real
    method and watching these go red.
    """
    conditions = PageRepository._list_conditions(
        viewer_sub=viewer_sub,
        is_site_admin=is_site_admin,
        owner_sub=owner_sub,
        role=role,
    )
    compiled = select(Page).where(*conditions).compile(dialect=postgresql.dialect())
    return str(compiled).split("WHERE", 1)[1] + " || " + repr(compiled.params)


def _visibility_clause(
    *, viewer_sub: str | None, include_own_private: bool, is_site_admin: bool = False
) -> str:
    return " ".join(
        str(condition)
        for condition in PageRepository._visibility_conditions(
            viewer_sub=viewer_sub,
            is_site_admin=is_site_admin,
            include_own_private=include_own_private,
        )
    )


@pytest.mark.parametrize("role", ["owned", "admin", None], ids=["owned", "admin", "unfiltered"])
def test_every_role_filter_compiles_to_real_sql(role: str | None) -> None:
    """The regression: the admin branch joined its alternatives with
    `func.or_`, which compiles to a call to a Postgres function named `or` —
    which does not exist. The query was a syntax error, so `role=admin` 500'd
    and only that filter, while every other role was fine.

    Compiling to the real dialect is the only check that can see this: the
    expression tree looks perfectly reasonable."""
    where = _list_where(role=role)

    assert " or(" not in where


def test_the_signed_in_owner_alternative_is_an_or_not_a_conjunction() -> None:
    """The regression: the two alternatives went into the WHERE as separate
    conditions, which `.where()` ANDs, so a signed-in viewer saw public and
    internal pages only when they happened to own them — their own private
    pages, and everyone else's public ones, never."""
    clause = _visibility_clause(viewer_sub="owner", include_own_private=True)

    assert " OR " in clause
    assert "owner" in clause


def test_a_guest_still_gets_public_only() -> None:
    clause = _visibility_clause(viewer_sub=None, include_own_private=False)

    assert " OR " not in clause
    assert "public" in str(
        PageRepository._visibility_conditions(
            viewer_sub=None, is_site_admin=False, include_own_private=False
        )[0]
        .compile()
        .params
    )


def test_a_site_admin_still_gets_no_restriction() -> None:
    assert (
        PageRepository._visibility_conditions(
            viewer_sub="root", is_site_admin=True, include_own_private=True
        )
        == []
    )


def _visible_kinds(where: str) -> set:
    """The visibility values a compiled WHERE can return.

    Read from the bound parameters as well as the SQL text: an `IN (public,
    internal)` is a POSTCOMPILE placeholder, so the values never appear in the
    statement string and a text-only search finds none of them."""
    import re

    found = set(re.findall(r"'(\w+)'", where))
    return {PageVisibility(kind) for kind in found if kind in PageVisibility._value2member_map_}


def test_a_browse_never_lists_a_private_page_even_for_its_owner() -> None:
    """The rule: `/mynuspace` is a public directory. A `private` page reached it
    because the owner alternative in the visibility WHERE had no `role` to
    narrow it — the one page in the app that was never meant to be listed
    showed up in the public grid to the person who made it private."""
    where = _list_where(role=None)

    # Not "private is absent from the params" — it always was, and is: a private
    # page reached the directory through `owner = me`, the second half of the
    # visibility OR. So assert the alternative itself is gone, which is the
    # only thing standing between a private page and a public grid.
    assert "owner" not in where
    # ... and the two browse-able kinds are still there, or the directory is empty.
    assert {PageVisibility.public, PageVisibility.internal} <= _visible_kinds(where)


def test_my_pages_still_lists_my_private_pages() -> None:
    """`role=owned` is the caller saying "the pages I manage", which is the one
    case where a private page belongs in a list. Guarding the rule above by
    this, so a fix for the directory cannot quietly empty the management list.

    The page reaches the list through the owner alternative, not through a
    `private` literal: it is `owner = me`, which the visibility OR keeps
    open, so no `private` value is named here and none needs to be."""
    where = _list_where(role="owned")

    assert PageVisibility.private not in _visible_kinds(where)
    assert " OR " in where
    assert "owner" in where


def test_owner_sub_also_asks_for_my_pages() -> None:
    """`owner_sub=me` is the other way to scope a list to yourself."""
    where = _list_where(role=None, owner_sub="owner")

    # `owner_sub=me` is the caller scoping the list to themselves, the same
    # statement `role=owned` makes, so the owner alternative stays open and my
    # private pages are in this list too.
    assert " OR " in where
    assert where.count("owner") >= 2


def test_a_page_admin_sees_their_private_page_in_my_pages() -> None:
    """`role=admin` reaches private pages through the membership alternative,
    not the owner one — the admin is not the owner and the OR is what lets it
    through."""
    where = _list_where(role="admin")

    assert "page_admins" in where
    assert " or(" not in where
