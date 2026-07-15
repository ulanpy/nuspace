from typing import List, Tuple

from httpx import AsyncClient
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.common.utils import meilisearch
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.community import (
    Community,
    CommunityAchievements,
    CommunityCategory,
    CommunityPhotoAlbum,
    CommunityPhotoAlbumType,
    CommunityRecruitmentStatus,
    CommunityType,
)
from backend.core.database.models.media import Media, MediaFormat


class CommunityRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def add_community(self, community_data) -> Community:
        community = Community(**community_data.model_dump())
        self.db_session.add(community)
        await self.db_session.flush()
        stmt = (
            select(Community)
            .where(Community.id == community.id)
            .options(
                selectinload(Community.head_user),
                selectinload(Community.achievements),
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().one()

    async def update_community(self, community: Community, new_data) -> Community:
        for field, value in new_data.model_dump(exclude_unset=True).items():
            if hasattr(community, field):
                setattr(community, field, value)
        await self.db_session.flush()
        stmt = (
            select(Community)
            .where(Community.id == community.id)
            .options(
                selectinload(Community.head_user),
                selectinload(Community.achievements),
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().one()

    async def delete_community(self, community: Community) -> bool:
        try:
            await self.db_session.delete(community)
            return True
        except Exception:
            return False

    async def delete_media(self, media_objects: List[Media]) -> bool:
        try:
            for media in media_objects:
                await self.db_session.delete(media)
            return True
        except Exception:
            return False

    async def upsert_search(self, meilisearch_client: AsyncClient, community: Community) -> None:
        await meilisearch.upsert(
            client=meilisearch_client,
            storage_name=Community.__tablename__,
            json_values={
                "id": community.id,
                "name": community.name,
                "description": community.description,
            },
        )

    async def delete_from_search(
        self, meilisearch_client: AsyncClient, community_id: int
    ) -> None:
        await meilisearch.delete(
            client=meilisearch_client,
            storage_name=Community.__tablename__,
            primary_key=str(community_id),
        )

    async def list_media(
        self,
        community_ids: List[int],
        media_formats: List[MediaFormat] | None = None,
    ) -> List[Media]:
        filters = [
            Media.entity_id.in_(community_ids),
            Media.entity_type == EntityType.communities,
        ]
        if media_formats:
            filters.append(Media.media_format.in_(media_formats))
        stmt = select(Media).where(*filters)
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def list_communities(
        self,
        *,
        page: int,
        size: int,
        community_type: CommunityType | None,
        community_category: CommunityCategory | None,
        recruitment_status: CommunityRecruitmentStatus | None,
        head_sub: str | None,
        keyword: str | None,
        meilisearch_client: AsyncClient,
    ) -> Tuple[List[Community], int, bool]:
        meili_result = None
        keyword_no_results = False

        if keyword:
            meili_result = await meilisearch.get(
                client=meilisearch_client,
                storage_name=EntityType.communities.value,
                keyword=keyword,
                page=page,
                size=size,
                filters=None,
            )
            community_ids = [item["id"] for item in meili_result.get("hits", [])]
            if not community_ids:
                estimated_hits = meili_result.get("estimatedTotalHits", 0) if meili_result else 0
                return [], estimated_hits, True

        conditions = []
        if community_type:
            conditions.append(Community.type == community_type)
        if community_category:
            conditions.append(Community.category == community_category)
        if recruitment_status:
            conditions.append(Community.recruitment_status == recruitment_status)
        if head_sub:
            conditions.append(Community.head == head_sub)
        if keyword:
            conditions.append(Community.id.in_(community_ids))

        base_stmt = (
            select(Community)
            .where(*conditions)
            .options(
                selectinload(Community.head_user),
                selectinload(Community.achievements),
            )
        )

        if keyword:
            order_clause = case(
                *[
                    (Community.id == community_id, index)
                    for index, community_id in enumerate(community_ids)
                ],
                else_=len(community_ids),
            )
            stmt = base_stmt.order_by(order_clause)
            result = await self.db_session.execute(stmt)
            communities: List[Community] = list(result.scalars().all())
            count: int = meili_result.get("estimatedTotalHits", 0) if meili_result else 0
        else:
            page_num = max(1, page or 1)
            stmt = (
                base_stmt.order_by(Community.name.asc())
                .offset((page_num - 1) * size)
                .limit(size)
            )
            result = await self.db_session.execute(stmt)
            communities = list(result.scalars().all())
            count_stmt = select(func.count()).select_from(Community).where(*conditions)
            count_result = await self.db_session.execute(count_stmt)
            count = count_result.scalar() or 0

        return communities, count, keyword_no_results

    async def get_achievements(
        self, community_id: int, size: int, page: int
    ) -> Tuple[List[CommunityAchievements], int]:
        conditions = [CommunityAchievements.community_id == community_id]
        page_num = max(1, page or 1)
        stmt = (
            select(CommunityAchievements)
            .where(*conditions)
            .order_by(CommunityAchievements.year.desc())
            .offset((page_num - 1) * size)
            .limit(size)
        )
        result = await self.db_session.execute(stmt)
        achievements: List[CommunityAchievements] = list(result.scalars().all())

        count_stmt = (
            select(func.count())
            .select_from(CommunityAchievements)
            .where(*conditions)
        )
        count_result = await self.db_session.execute(count_stmt)
        count: int = count_result.scalar() or 0
        return achievements, count

    async def create_achievement(self, achievement_data) -> CommunityAchievements:
        achievement = CommunityAchievements(**achievement_data.model_dump())
        self.db_session.add(achievement)
        await self.db_session.flush()
        await self.db_session.refresh(achievement)
        return achievement

    async def get_achievement(
        self, community_id: int, achievement_id: int
    ) -> CommunityAchievements | None:
        stmt = select(CommunityAchievements).where(
            CommunityAchievements.id == achievement_id,
            CommunityAchievements.community_id == community_id,
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def update_achievement(
        self, achievement: CommunityAchievements, achievement_data
    ) -> CommunityAchievements:
        for field, value in achievement_data.model_dump(exclude_unset=True).items():
            if hasattr(achievement, field):
                setattr(achievement, field, value)
        await self.db_session.flush()
        await self.db_session.refresh(achievement)
        return achievement

    async def delete_achievement(self, achievement: CommunityAchievements) -> bool:
        try:
            await self.db_session.delete(achievement)
            return True
        except Exception:
            return False

    async def load_relations(self, community: Community, relations: list[str] | None = None) -> None:
        """
        Ensure required relationships are loaded to avoid lazy-load during response building.
        """
        await self.db_session.refresh(community, relations or ["head_user", "achievements"])

    async def get_photo_albums(
        self,
        community_id: int,
        size: int,
        page: int,
        album_type: CommunityPhotoAlbumType | None = None,
    ) -> Tuple[List[CommunityPhotoAlbum], int]:
        conditions = [CommunityPhotoAlbum.community_id == community_id]

        if album_type is not None:
            conditions.append(CommunityPhotoAlbum.album_type == album_type)

        page_num = max(1, page or 1)
        stmt = (
            select(CommunityPhotoAlbum)
            .where(*conditions)
            .order_by(CommunityPhotoAlbum.created_at.asc())
            .offset((page_num - 1) * size)
            .limit(size)
        )
        result = await self.db_session.execute(stmt)
        albums: List[CommunityPhotoAlbum] = list(result.scalars().all())

        count_stmt = select(func.count()).select_from(CommunityPhotoAlbum).where(*conditions)
        count_result = await self.db_session.execute(count_stmt)
        count: int = count_result.scalar() or 0
        return albums, count

    async def create_photo_album(self, album_data: dict) -> CommunityPhotoAlbum:
        """Create a new photo album from dict data."""
        album = CommunityPhotoAlbum(**album_data)
        self.db_session.add(album)
        await self.db_session.flush()
        await self.db_session.refresh(album)
        return album

    async def get_photo_album(
        self, community_id: int, album_id: int
    ) -> CommunityPhotoAlbum | None:
        stmt = select(CommunityPhotoAlbum).where(
            CommunityPhotoAlbum.id == album_id,
            CommunityPhotoAlbum.community_id == community_id,
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def update_photo_album(
        self, album: CommunityPhotoAlbum, album_data: dict
    ) -> CommunityPhotoAlbum:
        """Update a photo album from dict data."""
        for key, value in album_data.items():
            if hasattr(album, key) and value is not None:
                setattr(album, key, value)
        await self.db_session.flush()
        await self.db_session.refresh(album)
        return album

    async def delete_photo_album(self, album: CommunityPhotoAlbum) -> bool:
        try:
            await self.db_session.delete(album)
            return True
        except Exception:
            return False

    async def get_all_photo_albums(
        self,
        size: int,
        page: int,
        album_type: CommunityPhotoAlbumType | None = None,
    ) -> Tuple[List[CommunityPhotoAlbum], int]:
        """Get photo albums from all communities."""
        conditions = []

        if album_type is not None:
            conditions.append(CommunityPhotoAlbum.album_type == album_type)

        page_num = max(1, page or 1)
        stmt = select(CommunityPhotoAlbum).options(selectinload(CommunityPhotoAlbum.community))
        if conditions:
            stmt = stmt.where(*conditions)
        stmt = (
            stmt.order_by(CommunityPhotoAlbum.created_at.desc())
            .offset((page_num - 1) * size)
            .limit(size)
        )
        result = await self.db_session.execute(stmt)
        albums: List[CommunityPhotoAlbum] = list(result.scalars().all())

        count_stmt = select(func.count()).select_from(CommunityPhotoAlbum)
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        count_result = await self.db_session.execute(count_stmt)
        count: int = count_result.scalar() or 0

        return albums, count
