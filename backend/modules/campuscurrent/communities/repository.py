from typing import List, Tuple

from httpx import AsyncClient
from sqlalchemy import case
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
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
        qb = QueryBuilder(session=self.db_session, model=Community)
        return await qb.add(
            data=community_data,
            preload=[Community.head_user, Community.achievements],
        )

    async def update_community(self, community: Community, new_data) -> Community:
        qb = QueryBuilder(session=self.db_session, model=Community)
        return await qb.update(
            instance=community,
            update_data=new_data,
            preload=[Community.head_user, Community.achievements],
        )

    async def delete_community(self, community: Community) -> bool:
        qb = QueryBuilder(session=self.db_session, model=Community)
        return await qb.blank(Community).delete(target=community)

    async def delete_media(self, media_objects: List[Media]) -> bool:
        qb = QueryBuilder(session=self.db_session, model=Media)
        return await qb.delete(target=media_objects)

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
        qb = QueryBuilder(session=self.db_session, model=Media)
        filters = [
            Media.entity_id.in_(community_ids),
            Media.entity_type == EntityType.communities,
        ]
        if media_formats:
            filters.append(Media.media_format.in_(media_formats))
        return await qb.base().filter(*filters).all()

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
        qb = QueryBuilder(session=self.db_session, model=Community)

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

        if keyword:
            order_clause = case(
                *[
                    (Community.id == community_id, index)
                    for index, community_id in enumerate(community_ids)
                ],
                else_=len(community_ids),
            )
            communities: List[Community] = (
                await qb.base()
                .filter(*conditions)
                .eager(Community.head_user, Community.achievements)
                .order(order_clause)
                .all()
            )
            count: int = meili_result.get("estimatedTotalHits", 0) if meili_result else 0
        else:
            communities = (
                await qb.base()
                .filter(*conditions)
                .eager(Community.head_user, Community.achievements)
                .paginate(size, page)
                .order(Community.name.asc())
                .all()
            )
            count = (
                await qb.blank(model=Community).base(count=True).filter(*conditions).count()
            )

        return communities, count, keyword_no_results

    async def get_achievements(
        self, community_id: int, size: int, page: int
    ) -> Tuple[List[CommunityAchievements], int]:
        qb = QueryBuilder(session=self.db_session, model=CommunityAchievements)
        achievements: List[CommunityAchievements] = (
            await qb.base()
            .filter(CommunityAchievements.community_id == community_id)
            .order(CommunityAchievements.year.desc())
            .paginate(size, page)
            .all()
        )
        count: int = (
            await qb.blank(model=CommunityAchievements)
            .base(count=True)
            .filter(CommunityAchievements.community_id == community_id)
            .count()
        )
        return achievements, count

    async def create_achievement(self, achievement_data) -> CommunityAchievements:
        qb = QueryBuilder(session=self.db_session, model=CommunityAchievements)
        return await qb.add(data=achievement_data)

    async def get_achievement(
        self, community_id: int, achievement_id: int
    ) -> CommunityAchievements | None:
        qb = QueryBuilder(session=self.db_session, model=CommunityAchievements)
        return (
            await qb.base()
            .filter(
                CommunityAchievements.id == achievement_id,
                CommunityAchievements.community_id == community_id,
            )
            .first()
        )

    async def update_achievement(
        self, achievement: CommunityAchievements, achievement_data
    ) -> CommunityAchievements:
        qb = QueryBuilder(session=self.db_session, model=CommunityAchievements)
        return await qb.update(instance=achievement, update_data=achievement_data)

    async def delete_achievement(self, achievement: CommunityAchievements) -> bool:
        qb = QueryBuilder(session=self.db_session, model=CommunityAchievements)
        return await qb.delete(target=achievement)

    async def load_relations(self, community: Community, relations: list[str] | None = None) -> None:
        """
        Ensure required relationships are loaded to avoid lazy-load during response building.
        """
        await self.db_session.refresh(community, relations or ["head_user", "achievements"])

    # Photo Album operations
    async def get_photo_albums(
        self,
        community_id: int,
        size: int,
        page: int,
        album_type: CommunityPhotoAlbumType | None = None,
    ) -> Tuple[List[CommunityPhotoAlbum], int]:
        qb = QueryBuilder(session=self.db_session, model=CommunityPhotoAlbum)
        conditions = [CommunityPhotoAlbum.community_id == community_id]
        
        if album_type is not None:
            conditions.append(CommunityPhotoAlbum.album_type == album_type)
        
        albums: List[CommunityPhotoAlbum] = (
            await qb.base()
            .filter(*conditions)
            .order(CommunityPhotoAlbum.created_at.asc())
            .paginate(size, page)
            .all()
        )
        count: int = (
            await qb.blank(model=CommunityPhotoAlbum)
            .base(count=True)
            .filter(*conditions)
            .count()
        )
        return albums, count

    async def create_photo_album(self, album_data: dict) -> CommunityPhotoAlbum:
        """Create a new photo album from dict data."""
        album = CommunityPhotoAlbum(**album_data)
        self.db_session.add(album)
        await self.db_session.commit()
        await self.db_session.refresh(album)
        return album

    async def get_photo_album(
        self, community_id: int, album_id: int
    ) -> CommunityPhotoAlbum | None:
        qb = QueryBuilder(session=self.db_session, model=CommunityPhotoAlbum)
        return (
            await qb.base()
            .filter(
                CommunityPhotoAlbum.id == album_id,
                CommunityPhotoAlbum.community_id == community_id,
            )
            .first()
        )

    async def update_photo_album(
        self, album: CommunityPhotoAlbum, album_data: dict
    ) -> CommunityPhotoAlbum:
        """Update a photo album from dict data."""
        for key, value in album_data.items():
            if hasattr(album, key) and value is not None:
                setattr(album, key, value)
        await self.db_session.commit()
        await self.db_session.refresh(album)
        return album

    async def delete_photo_album(self, album: CommunityPhotoAlbum) -> bool:
        qb = QueryBuilder(session=self.db_session, model=CommunityPhotoAlbum)
        return await qb.delete(target=album)
