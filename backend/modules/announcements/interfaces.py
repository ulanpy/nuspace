from __future__ import annotations

from typing import Protocol

from backend.common.schemas import Infra
from backend.core.database.models.community import (
    CommunityCategory,
    CommunityPhotoAlbumType,
    CommunityRecruitmentStatus,
    CommunityType,
)
from backend.modules.campuscurrent.communities import schemas as community_schemas
from backend.modules.campuscurrent.events import schemas as event_schemas


class CommunityCatalog(Protocol):
    async def list_all_photo_albums(
        self,
        *,
        size: int,
        page: int,
        album_type: CommunityPhotoAlbumType | None,
    ) -> community_schemas.ListPhotoAlbums: ...

    async def list_communities(
        self,
        infra: Infra,
        user: tuple[dict, dict],
        *,
        page: int,
        size: int,
        community_type: CommunityType | None,
        community_category: CommunityCategory | None,
        recruitment_status: CommunityRecruitmentStatus | None,
        head_sub: str | None,
        keyword: str | None,
    ) -> community_schemas.ListCommunity: ...


class EventCatalog(Protocol):
    async def get_events(
        self,
        user: tuple[dict, dict],
        event_filter: event_schemas.EventFilter,
        infra: Infra,
    ) -> event_schemas.ListEventResponse: ...
