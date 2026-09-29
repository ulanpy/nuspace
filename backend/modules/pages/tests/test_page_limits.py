"""The two caps this refactor adds: 100 pages per owner, 20 carousel images.

The image cap is the interesting one — the authorizer is called once per
*target*, not once per file, so `count` has to reach it or every batch looks
like a single upload and the cap is off by the batch size.
"""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from backend.modules.pages.constants import MAX_PAGE_IMAGES, MAX_PAGES_PER_OWNER
from backend.modules.pages.repository import PageRepository
from backend.modules.pages.schemas import PageCreateRequest
from backend.modules.pages.service import PageService
from fastapi import HTTPException

OWNER = ({"sub": "owner"}, {"role": "user"})


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


def _service(*, owned_pages=0, existing_images=0):
    repo = MagicMock(spec=PageRepository)
    repo.count_owned_pages = _async_return(owned_pages)
    repo.get_user_by_sub = _async_return(SimpleNamespace(sub="owner"))
    repo.add_page = _async_return(_page_stub(id=1, owner="owner", slug="test-page"))
    repo.upsert_search = _async_return(None)
    repo.get_by_id = _async_return(_page_stub())
    repo.is_admin = _async_return(True)
    repo.count_page_images = _async_return(existing_images)
    repo.load_relations = _async_return(None)
    repo.list_media = _async_return([])

    uow = MagicMock()
    uow.get_repo = MagicMock(return_value=repo)
    uow.__aenter__ = _async_return(None)
    uow.__aexit__ = _async_return(False)
    return PageService(uow=uow, media_attachment_resolver=_resolver()), repo


def _create_request(**overrides) -> PageCreateRequest:
    values = {"name": "Test", "slug": "test-page", "owner": "me"}
    values.update(overrides)
    return PageCreateRequest(**values)


@pytest.mark.asyncio
async def test_creating_a_page_below_the_cap_works():
    service, _ = _service(owned_pages=MAX_PAGES_PER_OWNER - 1)

    await service.create_page(infra=MagicMock(), page_data=_create_request(), user=OWNER)


@pytest.mark.asyncio
async def test_creating_a_page_at_the_cap_is_a_409():
    service, _ = _service(owned_pages=MAX_PAGES_PER_OWNER)

    with pytest.raises(HTTPException) as exc_info:
        await service.create_page(infra=MagicMock(), page_data=_create_request(), user=OWNER)

    assert exc_info.value.status_code == 409
    assert str(MAX_PAGES_PER_OWNER) in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_a_site_admin_gets_no_exemption_from_the_page_cap():
    """One rule, no special case: an admin is still one account."""
    service, _ = _service(owned_pages=MAX_PAGES_PER_OWNER)
    site_admin = ({"sub": "root"}, {"role": "admin"})

    with pytest.raises(HTTPException) as exc_info:
        await service.create_page(infra=MagicMock(), page_data=_create_request(), user=site_admin)

    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_owner_defaults_to_me():
    service, _ = _service()
    request = _create_request()

    await service.create_page(infra=MagicMock(), page_data=request, user=OWNER)

    # The literal "me" must not reach the FK column.
    assert request.owner == "owner"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("existing", "count", "ok"),
    [
        (0, 20, True),
        (19, 1, True),
        (19, 2, False),
        (18, 2, True),
        (20, 1, False),
        (MAX_PAGE_IMAGES, 1, False),
    ],
)
async def test_the_image_cap_is_existing_plus_count(existing: int, count: int, ok: bool):
    service, _ = _service(existing_images=existing)

    if ok:
        await service.authorize_media_upload(page_id=7, user=OWNER, count=count)
        return

    with pytest.raises(HTTPException) as exc_info:
        await service.authorize_media_upload(page_id=7, user=OWNER, count=count)

    assert exc_info.value.status_code == 400
    assert str(MAX_PAGE_IMAGES) in str(exc_info.value.detail)
