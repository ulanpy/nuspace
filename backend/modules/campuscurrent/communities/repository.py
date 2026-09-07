from typing import List, Tuple

from httpx import AsyncClient
from sqlalchemy import case, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.common.datetime_utils import utc_now
from backend.common.utils import meilisearch
from backend.modules.auth.models import User
from backend.modules.campuscurrent.models.community import (
    Community,
    CommunityAdmin,
    CommunityAdminLink,
    CommunityCategory,
    CommunityType,
)
from backend.modules.media.models import EntityType, Media, MediaFormat


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
            .options(selectinload(Community.owner_user))
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().one()

    async def update_community(self, community: Community, new_data) -> Community:
        for field, value in new_data.model_dump(
            exclude_unset=True, exclude={"media_ids_to_delete"}
        ).items():
            if hasattr(community, field):
                setattr(community, field, value)
        await self.db_session.flush()
        stmt = (
            select(Community)
            .where(Community.id == community.id)
            .options(selectinload(Community.owner_user))
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

    @staticmethod
    async def upsert_search(meilisearch_client: AsyncClient, community: Community) -> None:
        await meilisearch.upsert(
            client=meilisearch_client,
            storage_name=Community.__tablename__,
            json_values={
                "id": community.id,
                "name": community.name,
            },
        )

    @staticmethod
    async def delete_from_search(meilisearch_client: AsyncClient, community_id: int) -> None:
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
        owner_sub: str | None,
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
        if owner_sub:
            conditions.append(Community.owner == owner_sub)
        if keyword:
            conditions.append(Community.id.in_(community_ids))

        base_stmt = select(Community).where(*conditions).options(selectinload(Community.owner_user))

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
            has_media = exists(
                select(Media.id).where(
                    Media.entity_id == Community.id,
                    Media.entity_type == EntityType.communities,
                )
            )
            stmt = (
                base_stmt.order_by(has_media.desc(), Community.name.asc())
                .offset((page_num - 1) * size)
                .limit(size)
            )
            result = await self.db_session.execute(stmt)
            communities = list(result.scalars().all())
            count_stmt = select(func.count()).select_from(Community).where(*conditions)
            count_result = await self.db_session.execute(count_stmt)
            count = count_result.scalar() or 0

        return communities, count, keyword_no_results

    async def load_relations(
        self, community: Community, relations: list[str] | None = None
    ) -> None:
        await self.db_session.refresh(community, relations or ["owner_user"])

    async def get_by_id(self, community_id: int) -> Community | None:
        stmt = (
            select(Community)
            .where(Community.id == community_id)
            .options(selectinload(Community.owner_user))
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def get_by_slug(self, slug: str) -> Community | None:
        stmt = (
            select(Community)
            .where(Community.slug == slug)
            .options(selectinload(Community.owner_user))
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def get_user_by_sub(self, sub: str) -> User | None:
        stmt = select(User).where(User.sub == sub)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def list_admins(self, community_id: int) -> List[CommunityAdmin]:
        stmt = (
            select(CommunityAdmin)
            .where(CommunityAdmin.community_id == community_id)
            .options(selectinload(CommunityAdmin.user))
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def add_admin(self, community_id: int, user_sub: str) -> CommunityAdmin:
        admin = CommunityAdmin(community_id=community_id, user_sub=user_sub)
        self.db_session.add(admin)
        await self.db_session.flush()
        stmt = (
            select(CommunityAdmin)
            .where(
                CommunityAdmin.community_id == community_id,
                CommunityAdmin.user_sub == user_sub,
            )
            .options(selectinload(CommunityAdmin.user))
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().one()

    async def remove_admin(self, community_id: int, user_sub: str) -> bool:
        stmt = select(CommunityAdmin).where(
            CommunityAdmin.community_id == community_id,
            CommunityAdmin.user_sub == user_sub,
        )
        result = await self.db_session.execute(stmt)
        admin = result.scalars().first()
        if admin is None:
            return False
        await self.db_session.delete(admin)
        return True

    async def is_admin(self, community_id: int, user_sub: str) -> bool:
        stmt = select(CommunityAdmin).where(
            CommunityAdmin.community_id == community_id,
            CommunityAdmin.user_sub == user_sub,
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first() is not None

    async def admin_community_ids(self, user_sub: str) -> set[int]:
        stmt = select(CommunityAdmin.community_id).where(CommunityAdmin.user_sub == user_sub)
        result = await self.db_session.execute(stmt)
        return set(result.scalars().all())

    async def get_active_admin_link(self, community_id: int) -> CommunityAdminLink | None:
        stmt = select(CommunityAdminLink).where(
            CommunityAdminLink.community_id == community_id,
            CommunityAdminLink.revoked_at.is_(None),
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def create_admin_link(
        self, community_id: int, token_hash: str, created_by_sub: str
    ) -> CommunityAdminLink:
        link = CommunityAdminLink(
            community_id=community_id,
            token_hash=token_hash,
            created_by_sub=created_by_sub,
        )
        self.db_session.add(link)
        await self.db_session.flush()
        return link

    async def revoke_admin_link(self, link: CommunityAdminLink) -> None:
        link.revoked_at = utc_now()
        await self.db_session.flush()

    async def get_admin_link_by_token_hash(self, token_hash: str) -> CommunityAdminLink | None:
        stmt = select(CommunityAdminLink).where(CommunityAdminLink.token_hash == token_hash)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()
