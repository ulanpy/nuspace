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


def _visibility_clause(*, viewer_sub: str | None, is_site_admin: bool) -> str:
    return " ".join(
        str(condition)
        for condition in PageRepository._visibility_conditions(
            viewer_sub=viewer_sub, is_site_admin=is_site_admin
        )
    )


def clause_obj(*, viewer_sub: str | None):
    conditions = PageRepository._visibility_conditions(viewer_sub=viewer_sub, is_site_admin=False)

    assert len(conditions) == 1
    return conditions[0]


def test_a_signed_in_viewer_visibility_is_an_alternative_not_a_conjunction() -> None:
    """The regression: the two alternatives went into the WHERE as separate
    conditions, which `.where()` ANDs, so a signed-in viewer saw public and
    internal pages only when they happened to own them — their own private
    pages, and everyone else's public ones, never."""
    clause = _visibility_clause(viewer_sub="owner", is_site_admin=False)

    assert " OR " in clause
    assert "owner" in clause


def test_a_guest_still_gets_public_only() -> None:
    clause = _visibility_clause(viewer_sub=None, is_site_admin=False)

    assert " OR " not in clause
    assert PageVisibility.public in list(clause_obj(viewer_sub=None).compile().params.values())


def test_a_site_admin_still_gets_no_restriction() -> None:
    assert PageRepository._visibility_conditions(viewer_sub="root", is_site_admin=True) == []


def test_a_signed_in_viewer_still_sees_the_two_visible_kinds() -> None:
    """The OR must not have quietly narrowed the non-owner branch to one kind."""
    params = list(clause_obj(viewer_sub="owner").compile().params.values())

    assert {PageVisibility.public, PageVisibility.internal} <= {
        kind for value in params for kind in (value if isinstance(value, list) else [value])
    }


def _list_where(*, role: str | None, owner_sub: str | None = None, viewer_sub="owner") -> str:
    """The real WHERE of `list_pages`, compiled to Postgres SQL."""
    repo = PageRepository.__new__(PageRepository)
    conditions: list = []
    match_any: list = []
    if role == "owned":
        conditions.append(Page.owner == viewer_sub)
    elif role == "admin":
        match_any.append(
            Page.id.in_(select(PageAdmin.page_id).where(PageAdmin.user_sub == viewer_sub))
        )
    if owner_sub:
        conditions.append(Page.owner == owner_sub)
    visible = repo._visibility_conditions(viewer_sub=viewer_sub, is_site_admin=False)
    if match_any:
        conditions.append(or_(*visible, *match_any))
    else:
        conditions.extend(visible)

    compiled = str(select(Page).where(*conditions).compile(dialect=postgresql.dialect()))
    return compiled.split("WHERE", 1)[1]


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
