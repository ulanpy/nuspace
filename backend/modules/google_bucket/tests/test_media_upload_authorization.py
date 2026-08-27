import pytest
from backend.modules.google_bucket.service import CampusCurrentMediaUploadAuthorizer
from backend.modules.media.models import EntityType
from fastapi import HTTPException


class _Events:
    def __init__(self) -> None:
        self.calls: list[tuple[int, tuple[dict, dict]]] = []

    async def authorize_media_upload(self, entity_id: int, user: tuple[dict, dict]) -> None:
        self.calls.append((entity_id, user))


class _Communities:
    def __init__(self) -> None:
        self.calls: list[tuple[int, tuple[dict, dict]]] = []

    async def authorize_media_upload(self, entity_id: int, user: tuple[dict, dict]) -> None:
        self.calls.append((entity_id, user))


@pytest.mark.asyncio
async def test_authorizes_event_media_with_event_policy() -> None:
    events = _Events()
    communities = _Communities()
    user = ({"sub": "user-1"}, {})
    authorizer = CampusCurrentMediaUploadAuthorizer(events=events, communities=communities)  # type: ignore[arg-type]

    await authorizer.authorize_media_upload(
        entity_type=EntityType.community_events,
        entity_id=42,
        user=user,
    )

    assert events.calls == [(42, user)]
    assert communities.calls == []


@pytest.mark.asyncio
async def test_authorizes_community_media_with_community_policy() -> None:
    events = _Events()
    communities = _Communities()
    user = ({"sub": "user-1"}, {})
    authorizer = CampusCurrentMediaUploadAuthorizer(events=events, communities=communities)  # type: ignore[arg-type]

    await authorizer.authorize_media_upload(
        entity_type=EntityType.communities,
        entity_id=7,
        user=user,
    )

    assert events.calls == []
    assert communities.calls == [(7, user)]


@pytest.mark.asyncio
async def test_rejects_unimplemented_media_resource_types() -> None:
    authorizer = CampusCurrentMediaUploadAuthorizer(
        events=_Events(),  # type: ignore[arg-type]
        communities=_Communities(),  # type: ignore[arg-type]
    )

    with pytest.raises(HTTPException) as exc_info:
        await authorizer.authorize_media_upload(
            entity_type=EntityType.tickets,
            entity_id=8,
            user=({"sub": "user-1"}, {}),
        )

    assert exc_info.value.status_code == 403
