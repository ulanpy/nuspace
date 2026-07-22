from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.schemas import Infra, ShortUserResponse
from backend.common.utils import response_builder
from backend.common.utils.enums import ResourceAction
from backend.modules.campuscurrent.communities import schemas
from backend.modules.campuscurrent.communities.interfaces import MediaAttachmentResolver
from backend.modules.campuscurrent.communities.policy import CommunityPolicy
from backend.modules.campuscurrent.communities.repository import CommunityRepository
from backend.modules.campuscurrent.communities.utils import get_community_permissions
from backend.modules.campuscurrent.models.community import (
    Community,
    CommunityCategory,
    CommunityRecruitmentStatus,
    CommunityType,
)
from backend.modules.media.models import EntityType, Media, MediaFormat
from backend.modules.media.schemas import MediaResponse


class CommunityService:
    def __init__(
        self,
        db_session: AsyncSession,
        media_attachment_resolver: MediaAttachmentResolver,
        repo: CommunityRepository | None = None,
    ):
        self.db_session = db_session
        self.media_attachment_resolver = media_attachment_resolver
        self.repo = repo or CommunityRepository(db_session)

    async def _get_community_or_404(self, community_id: int) -> Community:
        community = await self.repo.get_by_id(community_id)
        if community is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Community not found"
            )
        return community

    async def _ensure_user_exists(self, sub: str) -> None:
        if await self.repo.get_user_by_sub(sub) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    async def create_community(
        self, infra: Infra, community_data: schemas.CommunityCreateRequest, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        await CommunityPolicy(user=user).check_permission(
            action=ResourceAction.CREATE, community_data=community_data
        )

        head_sub = user[0].get("sub") if community_data.head == "me" else community_data.head
        await self._ensure_user_exists(head_sub)
        community_data.head = head_sub

        community: Community = await self.repo.add_community(community_data)
        await self.repo.upsert_search(infra.meilisearch_client, community)

        media_objs: List[Media] = await self.repo.list_media(
            community_ids=[community.id],
            media_formats=[MediaFormat.profile, MediaFormat.banner],
        )
        media_results: List[List[MediaResponse]] = await self.media_attachment_resolver.map_to_resources(
            media_objects=media_objs, resources=[community]
        )

        return response_builder.build_schema(
            schemas.CommunityResponse,
            schemas.CommunityResponse.model_validate(community),
            head_user=ShortUserResponse.model_validate(community.head_user),
            media=media_results[0] if media_results else [],
            permissions=get_community_permissions(community, user),
        )

    async def update_community(
        self,
        infra: Infra,
        community_id: int,
        new_data: schemas.CommunityUpdateRequest,
        user: tuple[dict, dict],
    ) -> schemas.CommunityResponse:
        community = await self._get_community_or_404(community_id)
        await CommunityPolicy(user=user).check_permission(
            action=ResourceAction.UPDATE, community=community, community_data=new_data
        )

        media_ids_to_delete = new_data.media_ids_to_delete or []
        community = await self.repo.update_community(community=community, new_data=new_data)
        await self.repo.upsert_search(infra.meilisearch_client, community)

        if media_ids_to_delete:
            await self._delete_community_media(infra, community, media_ids_to_delete)

        return await self._build_community_response(community, infra, user)

    async def _delete_community_media(
        self,
        infra: Infra,
        community: Community,
        media_ids: List[int],
    ) -> None:
        media_objects = await self.media_attachment_resolver.list_by_ids(media_ids)

        found_ids = {media.id for media in media_objects}
        missing = set(media_ids) - found_ids
        if missing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Media not found: {sorted(missing)}",
            )

        for media in media_objects:
            if media.entity_type != EntityType.communities or media.entity_id != community.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Media does not belong to this community",
                )

        await self.media_attachment_resolver.delete_many(media_objects)

    async def delete_community(
        self, infra: Infra, community_id: int, user: tuple[dict, dict]
    ) -> None:
        community = await self._get_community_or_404(community_id)
        await CommunityPolicy(user=user).check_permission(
            action=ResourceAction.DELETE, community=community
        )

        media_objects: List[Media] = await self.repo.list_media(community_ids=[community.id])
        await self.media_attachment_resolver.delete_many(media_objects)

        deleted_community = await self.repo.delete_community(community)
        if not deleted_community:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Community not found"
            )

        await self.repo.delete_from_search(infra.meilisearch_client, community_id)

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
    ) -> schemas.ListCommunity:
        await CommunityPolicy(user=user).check_permission(action=ResourceAction.READ)

        head_sub = user[0].get("sub") if head_sub == "me" else head_sub

        communities, count, keyword_no_results = await self.repo.list_communities(
            page=page,
            size=size,
            community_type=community_type,
            community_category=community_category,
            recruitment_status=recruitment_status,
            head_sub=head_sub,
            keyword=keyword,
            meilisearch_client=infra.meilisearch_client,
        )

        if keyword_no_results:
            return schemas.ListCommunity(
                items=[],
                total_pages=1,
                total=0,
                page=page,
                size=size,
                has_next=False,
            )

        media_objs: List[Media] = await self.repo.list_media(
            community_ids=[community.id for community in communities],
            media_formats=[MediaFormat.profile, MediaFormat.banner],
        )
        media_results: List[List[MediaResponse]] = await self.media_attachment_resolver.map_to_resources(
            media_objects=media_objs, resources=communities
        )

        community_responses: List[schemas.CommunityResponse] = [
            response_builder.build_schema(
                schemas.CommunityResponse,
                schemas.CommunityResponse.model_validate(community),
                media=media,
                permissions=get_community_permissions(community, user),
            )
            for community, media in zip(communities, media_results)
        ]

        total_pages: int = response_builder.calculate_pages(count=count, size=size)
        return schemas.ListCommunity(
            items=community_responses,
            total_pages=total_pages,
            total=count,
            page=page,
            size=size,
            has_next=page < total_pages,
        )

    async def get_community_response(
        self, infra: Infra, community_id: int, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        community = await self._get_community_or_404(community_id)
        await CommunityPolicy(user=user).check_permission(
            action=ResourceAction.READ, community=community
        )
        return await self._build_community_response(community, infra, user)

    async def _build_community_response(
        self, community: Community, infra: Infra, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        await self.repo.load_relations(community, ["head_user"])

        media_objs: List[Media] = await self.repo.list_media(
            community_ids=[community.id],
            media_formats=[MediaFormat.profile, MediaFormat.banner],
        )
        media_results: List[List[MediaResponse]] = await self.media_attachment_resolver.map_to_resources(
            media_objects=media_objs, resources=[community]
        )

        return response_builder.build_schema(
            schemas.CommunityResponse,
            schemas.CommunityResponse.model_validate(community),
            head_user=ShortUserResponse.model_validate(community.head_user),
            media=media_results[0] if media_results else [],
            permissions=get_community_permissions(community, user),
        )
