"""Read and write of the user's own profile page.

Split out of `service.py` because the auth service is about tokens and
sessions, and none of that. The policy is the only interesting part: a private
page is indistinguishable from a missing one to anyone but its owner.
"""

from typing import List

from fastapi import HTTPException, status

from backend.common.utils.response_builder import calculate_pages
from backend.core.database.uow import UnitOfWork
from backend.modules.auth import schemas
from backend.modules.auth.models import User, UserCategory, UserScope
from backend.modules.auth.repository import UserRepository
from backend.modules.campuscurrent.communities.interfaces import MediaAttachmentResolver
from backend.modules.campuscurrent.communities.repository import CommunityRepository
from backend.modules.media.models import EntityType, Media, MediaFormat
from backend.modules.media.schemas import MediaResponse
from backend.modules.shared.media_ownership import delete_owned_media


def has_design(page_content: dict | None) -> bool:
    """Whether a saved page has blocks in it, and so can be used as a template.

    Puck writes an empty page as `{"root": {...}, "content": []}`, so the
    content array is the only thing that says whether there is a design — the
    root is always there and always carries a title.
    """
    content = (page_content or {}).get("content")
    return isinstance(content, list) and len(content) > 0


class UserPagePolicy:
    """Who may see a profile page, and who may write one."""

    def __init__(self, viewer_sub: str | None):
        self.viewer_sub = viewer_sub

    def check_visible(self, user: User) -> None:
        """Private and banned pages 404 rather than 403.

        A 403 would confirm the page exists to someone who has no business
        knowing it does. The owner still gets through, so they can preview
        before publishing.
        """
        if user.sub == self.viewer_sub:
            return
        if not user.is_page_public or user.scope == UserScope.banned:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")


class UserPageService:
    def __init__(self, uow: UnitOfWork, media_attachment_resolver: MediaAttachmentResolver):
        self.uow = uow
        self.media_attachment_resolver = media_attachment_resolver

    async def _attach_media(self, users: List[User]) -> List[List[MediaResponse]]:
        async with self.uow:
            repo = self.uow.get_repo(UserRepository)
            media_objs: List[Media] = await repo.list_media(
                user_ids=[user.id for user in users],
                media_formats=[MediaFormat.profile, MediaFormat.banner],
            )
        return await self.media_attachment_resolver.map_to_resources(
            media_objects=media_objs, resources=users
        )

    async def authorize_user_media_upload(self, user_id: int, user: tuple[dict, dict]) -> None:
        """Gate a GCS upload for `entity_type=users`.

        `entity_id` here is the surrogate `users.id`, not the Keycloak sub —
        that is the whole reason phase 0 added the column.
        """
        async with self.uow:
            target = await self.uow.get_repo(UserRepository).get_by_id(user_id)
        if target is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if target.sub != user[0].get("sub"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only upload media to your own profile",
            )
        if target.scope == UserScope.banned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been banned",
            )

    async def _attach_communities(self, sub: str) -> List[schemas.UserCommunityResponse]:
        """The communities this person heads, with their position in each."""
        async with self.uow:
            repo = self.uow.get_repo(UserRepository)
            headed = await repo.list_headed_communities(sub)
            if not headed:
                return []
            media_objs: List[Media] = await self.uow.get_repo(CommunityRepository).list_media(
                [community.id for community, _ in headed],
                # The profile image only: a row in the community list shows an
                # avatar, and a community with fifty carousel photos would
                # otherwise ship all fifty to every reader of the page.
                [MediaFormat.profile],
            )

        rows = [
            schemas.UserCommunityResponse(
                id=community.id,
                name=community.name,
                slug=community.slug,
                position=position,
            )
            for community, position in headed
        ]
        # The same resolver the community pages use, keyed on the community id
        # because that is what `media.entity_id` holds for a community.
        media_per_row = await self.media_attachment_resolver.map_to_resources(
            media_objects=media_objs, resources=rows
        )
        return [row.model_copy(update={"media": media}) for row, media in zip(rows, media_per_row)]

    async def get_page(self, slug: str, viewer_sub: str | None) -> schemas.UserPageResponse:
        async with self.uow:
            user = await self.uow.get_repo(UserRepository).get_by_slug(slug)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

        UserPagePolicy(viewer_sub).check_visible(user)

        media = (await self._attach_media([user]))[0]
        return schemas.UserPageResponse(
            sub=user.sub,
            name=user.name,
            surname=user.surname,
            slug=user.slug,
            picture=user.picture,
            category=user.category,
            page_content=user.page_content,
            media=media,
            communities=await self._attach_communities(user.sub),
        )

    async def list_pages(
        self,
        *,
        page: int,
        size: int,
        keyword: str | None = None,
        category: UserCategory | None = None,
    ) -> schemas.UserPageList:
        async with self.uow:
            users, count = await self.uow.get_repo(UserRepository).list_public(
                page=page, size=size, keyword=keyword, category=category
            )

        total_pages = calculate_pages(count=count, size=size)
        # One batched media query for the whole page of rows, not one per row.
        media_per_row = await self._attach_media(users)
        return schemas.UserPageList(
            items=[
                schemas.UserSummaryResponse(
                    sub=user.sub,
                    name=user.name,
                    surname=user.surname,
                    slug=user.slug,
                    picture=user.picture,
                    category=user.category,
                    has_design=has_design(user.page_content),
                    media=media,
                )
                for user, media in zip(users, media_per_row)
            ],
            total=count,
            page=page,
            size=size,
            total_pages=total_pages,
            has_next=page < total_pages,
        )

    async def update_me(
        self, new_data: schemas.UserPageUpdateRequest, session_sub: str
    ) -> schemas.UserPageResponse:
        async with self.uow:
            repo = self.uow.get_repo(UserRepository)
            user = await repo.get_by_sub(session_sub)
            if user is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            # Nothing here takes a target sub: the route is /users/me, so the
            # only sub that can be written is the one in the session.
            for field, value in new_data.model_dump(
                exclude_unset=True, exclude={"media_ids_to_delete"}
            ).items():
                setattr(user, field, value)

        if new_data.media_ids_to_delete:
            await delete_owned_media(
                self.media_attachment_resolver,
                new_data.media_ids_to_delete,
                EntityType.users,
                user.id,
            )

        return await self.get_page(user.slug, session_sub)
