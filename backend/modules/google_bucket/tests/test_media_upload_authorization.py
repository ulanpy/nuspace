import pytest
from backend.modules.google_bucket.service import BucketMediaUploadAuthorizer
from backend.modules.media.models import EntityType
from fastapi import HTTPException


class _Events:
    def __init__(self) -> None:
        self.calls: list[tuple[int, tuple[dict, dict], int]] = []

    async def authorize_media_upload(
        self, entity_id: int, user: tuple[dict, dict], count: int = 1
    ) -> None:
        self.calls.append((entity_id, user, count))


class _Pages:
    def __init__(self) -> None:
        self.calls: list[tuple[int, tuple[dict, dict], int]] = []

    async def authorize_media_upload(
        self, entity_id: int, user: tuple[dict, dict], count: int = 1
    ) -> None:
        self.calls.append((entity_id, user, count))


def _authorizer(events: _Events, pages: _Pages):
    return BucketMediaUploadAuthorizer(events=events, pages=pages)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_authorizes_event_media_with_event_policy() -> None:
    events, pages = _Events(), _Pages()
    user = ({"sub": "user-1"}, {})

    await _authorizer(events, pages).authorize_media_upload(
        entity_type=EntityType.community_events,
        entity_id=42,
        user=user,
    )

    assert events.calls == [(42, user, 1)]
    assert pages.calls == []


@pytest.mark.asyncio
async def test_authorizes_page_media_with_page_policy() -> None:
    events, pages = _Events(), _Pages()
    user = ({"sub": "user-1"}, {})

    await _authorizer(events, pages).authorize_media_upload(
        entity_type=EntityType.pages,
        entity_id=7,
        user=user,
    )

    assert events.calls == []
    assert pages.calls == [(7, user, 1)]


@pytest.mark.asyncio
async def test_forwards_the_batch_count_to_the_page_cap() -> None:
    """The 20-image cap reads `existing + count`, so the count has to survive
    the hop through the authorizer or every batch looks like a single file."""
    events, pages = _Events(), _Pages()
    user = ({"sub": "user-1"}, {})

    await _authorizer(events, pages).authorize_media_upload(
        entity_type=EntityType.pages,
        entity_id=7,
        user=user,
        count=5,
    )

    assert pages.calls == [(7, user, 5)]


@pytest.mark.asyncio
async def test_rejects_unimplemented_media_resource_types() -> None:
    authorizer = _authorizer(_Events(), _Pages())

    with pytest.raises(HTTPException) as exc_info:
        await authorizer.authorize_media_upload(
            entity_type=EntityType.tickets,
            entity_id=8,
            user=({"sub": "user-1"}, {}),
        )

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_rejects_the_inert_users_entity_type() -> None:
    """`users` media is gone with the profile page; the enum value survives in
    Postgres but must not authorize anything."""
    authorizer = _authorizer(_Events(), _Pages())

    with pytest.raises(HTTPException) as exc_info:
        await authorizer.authorize_media_upload(
            entity_type=EntityType.users,
            entity_id=8,
            user=({"sub": "user-1"}, {}),
        )

    assert exc_info.value.status_code == 403
