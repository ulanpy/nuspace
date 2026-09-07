import hashlib
import secrets
from typing import List

from fastapi import HTTPException, status

from backend.common.schemas import Infra, ShortUserResponse
from backend.common.utils import response_builder
from backend.common.utils.enums import ResourceAction
from backend.core.database.uow import UnitOfWork
from backend.modules.campuscurrent.communities import schemas
from backend.modules.campuscurrent.communities.interfaces import MediaAttachmentResolver
from backend.modules.campuscurrent.communities.policy import CommunityPolicy
from backend.modules.campuscurrent.communities.repository import CommunityRepository
from backend.modules.campuscurrent.communities.utils import get_community_permissions
from backend.modules.campuscurrent.models.community import (
    Community,
    CommunityCategory,
    CommunityType,
)
from backend.modules.media.models import EntityType, Media, MediaFormat
from backend.modules.media.schemas import MediaResponse


class CommunityService:
    def __init__(
        self,
        uow: UnitOfWork,
        media_attachment_resolver: MediaAttachmentResolver,
    ):
        self.uow = uow
        self.media_attachment_resolver = media_attachment_resolver

    async def _get_community_or_404(self, slug: str) -> Community:
        async with self.uow:
            community = await self.uow.get_repo(CommunityRepository).get_by_slug(slug)
        if community is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
        return community

    async def _ensure_user_exists(self, sub: str) -> None:
        async with self.uow:
            if await self.uow.get_repo(CommunityRepository).get_user_by_sub(sub) is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    async def _load_community_and_policy(
        self, slug: str, user: tuple[dict, dict]
    ) -> tuple[Community, CommunityPolicy]:
        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            community = await repo.get_by_slug(slug)
            if community is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Community not found"
                )
            is_community_admin = await repo.is_admin(community.id, user[0]["sub"])
        return community, CommunityPolicy(user=user, is_community_admin=is_community_admin)

    @staticmethod
    def _build_admin_link_url(infra: Infra, community: Community, raw_token: str) -> str:
        origin = infra.config.HOME_URL.rstrip("/")
        return f"{origin}/communities/{community.slug}?admin={raw_token}"

    async def create_community(
        self, infra: Infra, community_data: schemas.CommunityCreateRequest, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        await CommunityPolicy(user=user).check_permission(
            action=ResourceAction.CREATE, community_data=community_data
        )

        owner_sub = user[0].get("sub") if community_data.owner == "me" else community_data.owner
        await self._ensure_user_exists(owner_sub)
        community_data.owner = owner_sub

        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            community: Community = await repo.add_community(community_data)
        await repo.upsert_search(infra.meilisearch_client, community)
        return await self._build_community_response(community, infra, user)

    async def update_community(
        self,
        infra: Infra,
        slug: str,
        new_data: schemas.CommunityUpdateRequest,
        user: tuple[dict, dict],
    ) -> schemas.CommunityResponse:
        media_ids_to_delete = new_data.media_ids_to_delete or []
        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            community = await repo.get_by_slug(slug)
            if community is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Community not found"
                )
            is_community_admin = await repo.is_admin(community.id, user[0]["sub"])
            await CommunityPolicy(
                user=user, is_community_admin=is_community_admin
            ).check_permission(
                action=ResourceAction.UPDATE, community=community, community_data=new_data
            )
            community = await repo.update_community(community=community, new_data=new_data)
        await repo.upsert_search(infra.meilisearch_client, community)

        if media_ids_to_delete:
            await self._delete_community_media(infra, community, media_ids_to_delete)

        return await self._build_community_response(community, infra, user)

    async def authorize_media_upload(self, community_id: int, user: tuple[dict, dict]) -> None:
        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            community = await repo.get_by_id(community_id)
            if community is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Community not found"
                )
            is_community_admin = await repo.is_admin(community.id, user[0]["sub"])
            await CommunityPolicy(
                user=user, is_community_admin=is_community_admin
            ).check_permission(action=ResourceAction.UPDATE, community=community)

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

    async def delete_community(self, infra: Infra, slug: str, user: tuple[dict, dict]) -> None:
        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            community = await repo.get_by_slug(slug)
            if community is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Community not found"
                )
            is_community_admin = await repo.is_admin(community.id, user[0]["sub"])
            await CommunityPolicy(
                user=user, is_community_admin=is_community_admin
            ).check_permission(action=ResourceAction.DELETE, community=community)
            media_objects: List[Media] = await repo.list_media(community_ids=[community.id])
            if not await repo.delete_community(community):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Community not found"
                )
        await self.media_attachment_resolver.delete_many(media_objects)
        await repo.delete_from_search(infra.meilisearch_client, community.id)

    async def reassign_owner(
        self, infra: Infra, slug: str, new_owner_sub: str, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            community = await repo.get_by_slug(slug)
            if community is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Community not found"
                )
            is_community_admin = await repo.is_admin(community.id, user[0]["sub"])
            await CommunityPolicy(
                user=user, is_community_admin=is_community_admin
            ).check_manage_admins(community)
            target_user = await repo.get_user_by_sub(new_owner_sub)
            if target_user is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found"
                )
            # An owner cannot also be a community admin — drop the row if present.
            if new_owner_sub != user[0]["sub"] and await repo.is_admin(community.id, new_owner_sub):
                await repo.remove_admin(community.id, new_owner_sub)
            community.owner = new_owner_sub
        await repo.upsert_search(infra.meilisearch_client, community)
        return await self._build_community_response(community, infra, user)

    async def toggle_verified(
        self, infra: Infra, slug: str, verified: bool, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            community = await repo.get_by_slug(slug)
            if community is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Community not found"
                )
            await CommunityPolicy(user=user).check_admin_only()
            community.verified = verified
        return await self._build_community_response(community, infra, user)

    async def list_communities(
        self,
        infra: Infra,
        user: tuple[dict, dict],
        *,
        page: int,
        size: int,
        community_type: CommunityType | None,
        community_category: CommunityCategory | None,
        owner_sub: str | None,
        keyword: str | None,
    ) -> schemas.ListCommunity:
        await CommunityPolicy(user=user).check_permission(action=ResourceAction.READ)

        owner_sub = user[0].get("sub") if owner_sub == "me" else owner_sub

        admin_community_ids: set[int] = set()

        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            if not user[1].get("is_guest"):
                admin_community_ids = await repo.admin_community_ids(user[0]["sub"])
            communities, count, keyword_no_results = await repo.list_communities(
                page=page,
                size=size,
                community_type=community_type,
                community_category=community_category,
                owner_sub=owner_sub,
                keyword=keyword,
                meilisearch_client=infra.meilisearch_client,
            )
            media_objs: List[Media] = await repo.list_media(
                community_ids=[community.id for community in communities],
                media_formats=[MediaFormat.profile, MediaFormat.banner],
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

        media_results: List[List[MediaResponse]] = (
            await self.media_attachment_resolver.map_to_resources(
                media_objects=media_objs, resources=communities
            )
        )

        community_responses: List[schemas.CommunityResponse] = [
            response_builder.build_schema(
                schemas.CommunityResponse,
                schemas.CommunityResponse.model_validate(community),
                media=media,
                permissions=get_community_permissions(
                    community, user, admin_community_ids=admin_community_ids
                ),
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
        self, infra: Infra, slug: str, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        community = await self._get_community_or_404(slug)
        await CommunityPolicy(user=user).check_permission(
            action=ResourceAction.READ, community=community
        )
        return await self._build_community_response(community, infra, user)

    async def _build_community_response(
        self, community: Community, infra: Infra, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        admin_rows = []
        user_is_admin = False
        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            community = await repo.get_by_id(community.id)
            if community is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Community not found"
                )
            await repo.load_relations(community, ["owner_user"])
            admin_rows = await repo.list_admins(community.id)
            user_is_admin = any(admin.user_sub == user[0]["sub"] for admin in admin_rows)
            media_objs: List[Media] = await repo.list_media(
                community_ids=[community.id],
                media_formats=[MediaFormat.profile, MediaFormat.banner],
            )
        media_results: List[List[MediaResponse]] = (
            await self.media_attachment_resolver.map_to_resources(
                media_objects=media_objs, resources=[community]
            )
        )

        admins = [
            schemas.AdminResponse(
                sub=admin.user_sub,
                name=admin.user.name,
                surname=admin.user.surname,
                picture=admin.user.picture,
                created_at=admin.created_at,
            )
            for admin in admin_rows
        ]
        admin_community_ids = {community.id} if user_is_admin else set()

        return response_builder.build_schema(
            schemas.CommunityResponse,
            schemas.CommunityResponse.model_validate(community),
            owner_user=ShortUserResponse.model_validate(community.owner_user),
            admins=admins,
            media=media_results[0] if media_results else [],
            permissions=get_community_permissions(
                community, user, admin_community_ids=admin_community_ids
            ),
        )

    @staticmethod
    def _hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode()).hexdigest()

    async def _issue_admin_link(
        self, infra: Infra, community: Community, user: tuple[dict, dict]
    ) -> schemas.AdminLinkResponse:
        """
        Revoke any active link and create a fresh one, returning its URL.
        """
        raw_token = secrets.token_urlsafe(32)
        token_hash = self._hash_token(raw_token)
        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            active = await repo.get_active_admin_link(community.id)
            if active is not None:
                await repo.revoke_admin_link(active)
            await repo.create_admin_link(community.id, token_hash, user[0]["sub"])
        return schemas.AdminLinkResponse(
            url=self._build_admin_link_url(infra, community, raw_token)
        )

    async def view_admin_link(
        self, infra: Infra, slug: str, user: tuple[dict, dict]
    ) -> schemas.AdminLinkResponse:
        community, policy = await self._load_community_and_policy(slug, user)
        await policy.check_admin_link(community)
        # If a link were already active we could only show its hash back, not the
        # raw shareable token — so viewing lazily issues a fresh link either way.
        return await self._issue_admin_link(infra, community, user)

    async def rotate_admin_link(
        self, infra: Infra, slug: str, user: tuple[dict, dict]
    ) -> schemas.AdminLinkResponse:
        community, policy = await self._load_community_and_policy(slug, user)
        await policy.check_admin_link(community)
        return await self._issue_admin_link(infra, community, user)

    async def accept_admin_link(
        self, infra: Infra, token: str, user: tuple[dict, dict]
    ) -> schemas.AdminLinkAcceptResponse:
        token_hash = self._hash_token(token)
        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            link = await repo.get_admin_link_by_token_hash(token_hash)
            if link is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Invite link not found"
                )
            if link.revoked_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_410_GONE, detail="Invite link has been revoked"
                )
            community = await repo.get_by_id(link.community_id)
            if community is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Community not found"
                )
            user_sub = user[0]["sub"]
            if community.owner_user.sub == user_sub:
                return schemas.AdminLinkAcceptResponse(status="already_owner")
            if await repo.is_admin(link.community_id, user_sub):
                return schemas.AdminLinkAcceptResponse(status="already_admin")
            await repo.add_admin(link.community_id, user_sub)
        return schemas.AdminLinkAcceptResponse(status="granted")

    async def remove_admin(
        self, infra: Infra, slug: str, user_sub: str, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        community, policy = await self._load_community_and_policy(slug, user)
        await policy.check_manage_admins(community)

        if user_sub == user[0]["sub"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use the leave action to remove yourself",
            )
        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            if not await repo.remove_admin(community.id, user_sub):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        return await self._build_community_response(community, infra, user)

    async def leave_admin(
        self, infra: Infra, slug: str, user: tuple[dict, dict]
    ) -> schemas.CommunityResponse:
        community, policy = await self._load_community_and_policy(slug, user)
        await policy.check_self_leave(community)

        async with self.uow:
            repo = self.uow.get_repo(CommunityRepository)
            await repo.remove_admin(community.id, user[0]["sub"])
        return await self._build_community_response(community, infra, user)
