"""The one genuinely new rule in this refactor: `PageVisibility`.

A hidden page must 404, not 403 — a 403 confirms the page exists to someone
with no business knowing it does. That is why this is tested as a matrix over
every viewer kind rather than as a handful of happy paths.

The matrix drives `PagePolicy` directly, so it also needs the service-level
tests at the bottom: a policy handed the right flag proves nothing about a
caller that never looks the flag up.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.common.utils.enums import ResourceAction
from backend.modules.pages.models.page import PageVisibility
from backend.modules.pages.policy import PagePolicy
from backend.modules.pages.repository import PageRepository
from backend.modules.pages.service import PageService
from fastapi import HTTPException

OWNER = ({"sub": "owner"}, {"role": "user"})
ADMIN_OF_PAGE = ({"sub": "helper"}, {"role": "user"})
STRANGER = ({"sub": "stranger"}, {"role": "user"})
SITE_ADMIN = ({"sub": "root"}, {"role": "admin"})
GUEST = ({"sub": None, "is_guest": True}, {"role": "default", "is_guest": True})


def _page(visibility: PageVisibility, owner: str | None = "owner") -> SimpleNamespace:
    return SimpleNamespace(id=7, owner=owner, visibility=visibility, slug="club")


def _policy(viewer: tuple[dict, dict], *, is_page_admin: bool = False) -> PagePolicy:
    return PagePolicy(user=viewer, is_page_admin=is_page_admin)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("visibility", "viewer", "is_page_admin", "expected"),
    [
        # public: everyone, guest included
        (PageVisibility.public, GUEST, False, 200),
        (PageVisibility.public, STRANGER, False, 200),
        (PageVisibility.public, OWNER, False, 200),
        # internal: signed-in only — this is the check people get wrong
        (PageVisibility.internal, GUEST, False, 404),
        (PageVisibility.internal, STRANGER, False, 200),
        (PageVisibility.internal, OWNER, False, 200),
        (PageVisibility.internal, ADMIN_OF_PAGE, True, 200),
        # private: owner, page admins and site admins only
        (PageVisibility.private, GUEST, False, 404),
        (PageVisibility.private, STRANGER, False, 404),
        (PageVisibility.private, OWNER, False, 200),
        (PageVisibility.private, ADMIN_OF_PAGE, True, 200),
        (PageVisibility.private, SITE_ADMIN, False, 200),
        # a site admin previews before publishing
        (PageVisibility.internal, SITE_ADMIN, False, 200),
    ],
)
async def test_visibility_matrix(
    visibility: PageVisibility,
    viewer: tuple[dict, dict],
    is_page_admin: bool,
    expected: int,
) -> None:
    page = _page(visibility)
    policy = _policy(viewer, is_page_admin=is_page_admin)

    if expected == 200:
        await policy.check_permission(action=ResourceAction.READ, page=page)
        return

    with pytest.raises(HTTPException) as exc_info:
        await policy.check_permission(action=ResourceAction.READ, page=page)
    assert exc_info.value.status_code == expected
    assert exc_info.value.detail == "Page not found"


@pytest.mark.asyncio
async def test_hidden_page_is_404_not_403() -> None:
    """The specific regression: leaking existence through the status code."""
    with pytest.raises(HTTPException) as exc_info:
        await _policy(STRANGER).check_visible(_page(PageVisibility.private))

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_an_ownerless_page_does_not_crash_the_owner_check() -> None:
    """`page.owner_user` is None on a page whose owner row is gone, and the old
    check read `page.owner_user.sub` on every single read and update."""
    page = _page(PageVisibility.public, owner=None)

    await _policy(STRANGER).check_permission(action=ResourceAction.READ, page=page)

    with pytest.raises(HTTPException) as exc_info:
        await _policy(OWNER).check_permission(action=ResourceAction.UPDATE, page=page)
    assert exc_info.value.status_code == 403


def _async_return(value):
    async def _call(*_args, **_kwargs):
        return value

    return _call


def _read_service(*, visibility: PageVisibility, viewer_is_page_admin: bool):
    """A service wired to a repo that reports the viewer is a page admin."""
    from datetime import datetime, timezone

    page = SimpleNamespace(
        id=7,
        name="Test",
        description=None,
        visibility=visibility,
        owner="owner",
        slug="club",
        page_content={},
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        owner_user=None,
    )
    repo = MagicMock(spec=PageRepository)
    repo.get_by_slug = _async_return(page)
    repo.get_by_id = _async_return(page)
    repo.is_admin = AsyncMock(return_value=viewer_is_page_admin)
    repo.load_relations = _async_return(None)
    repo.list_media = _async_return([])

    uow = MagicMock()
    uow.get_repo = MagicMock(return_value=repo)
    uow.__aenter__ = _async_return(None)
    uow.__aexit__ = _async_return(False)

    async def _map_to_resources(*_args, **_kwargs):
        return [[]]

    infra = MagicMock(meilisearch_client=MagicMock())
    return (
        PageService(
            uow=uow, media_attachment_resolver=MagicMock(map_to_resources=_map_to_resources)
        ),
        infra,
    )


@pytest.mark.asyncio
async def test_a_page_admin_can_read_a_private_page_it_manages() -> None:
    """The regression: the read path built its policy without `is_page_admin`.

    So the page appeared in the admin's list — `list_pages` resolves the flag —
    and then 404'd the moment it was opened. Not observable from the policy
    matrix, which is handed the flag directly.

    Only `private` discriminates: a page admin is signed in, so `internal`
    passes for them either way.
    """
    service, infra = _read_service(visibility=PageVisibility.private, viewer_is_page_admin=True)

    response = await service.get_page_response(infra=infra, slug="club", user=ADMIN_OF_PAGE)

    assert response.slug == "club"


@pytest.mark.asyncio
async def test_a_stranger_still_gets_a_404_on_the_same_page() -> None:
    """Same page, same service, same repo — only the admin flag differs.

    Guards against "fixing" the above by letting everyone through.
    """
    service, infra = _read_service(visibility=PageVisibility.private, viewer_is_page_admin=False)

    with pytest.raises(HTTPException) as exc_info:
        await service.get_page_response(infra=infra, slug="club", user=STRANGER)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Page not found"


@pytest.mark.asyncio
async def test_the_by_id_read_resolves_the_flag_too() -> None:
    """The OG and Telegram preview URLs address pages by `?id=`, and took the
    same shortcut. Both read paths have to agree."""
    service, infra = _read_service(visibility=PageVisibility.private, viewer_is_page_admin=True)

    response = await service.get_page_response_by_id(infra=infra, page_id=7, user=ADMIN_OF_PAGE)

    assert response.id == 7
