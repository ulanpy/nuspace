import hashlib
import secrets
from typing import List

from fastapi import HTTPException, status

from backend.common.schemas import Infra, ShortUserResponse
from backend.common.utils import response_builder
from backend.common.utils.enums import ResourceAction
from backend.core.database.uow import UnitOfWork
from backend.modules.auth.models import UserRole
from backend.modules.media.models import EntityType, Media, MediaFormat
from backend.modules.media.schemas import MediaResponse
from backend.modules.pages import schemas
from backend.modules.pages.constants import MAX_PAGE_IMAGES, MAX_PAGES_PER_OWNER
from backend.modules.pages.interfaces import MediaAttachmentResolver
from backend.modules.pages.models.page import Page, PageAdmin
from backend.modules.pages.policy import PagePolicy
from backend.modules.pages.repository import PageRepository
from backend.modules.pages.utils import get_page_permissions
from backend.modules.shared.media_ownership import delete_owned_media


class PageService:
    def __init__(
        self,
        uow: UnitOfWork,
        media_attachment_resolver: MediaAttachmentResolver,
    ):
        self.uow = uow
        self.media_attachment_resolver = media_attachment_resolver

    @staticmethod
    def _is_site_admin(user: tuple[dict, dict]) -> bool:
        return user[1]["role"] == UserRole.admin.value

    async def _ensure_user_exists(self, sub: str) -> None:
        async with self.uow:
            if await self.uow.get_repo(PageRepository).get_user_by_sub(sub) is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    async def _load_page_and_policy(
        self, slug: str, user: tuple[dict, dict]
    ) -> tuple[Page, PagePolicy]:
        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            page = await repo.get_by_slug(slug)
            if page is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
            is_page_admin = await repo.is_admin(page.id, user[0]["sub"])
        return page, PagePolicy(user=user, is_page_admin=is_page_admin)

    @staticmethod
    def _build_admin_link_url(infra: Infra, page: Page, raw_token: str) -> str:
        origin = infra.config.HOME_URL.rstrip("/")
        return f"{origin}/p/{page.slug}?admin={raw_token}"

    async def create_page(
        self, infra: Infra, page_data: schemas.PageCreateRequest, user: tuple[dict, dict]
    ) -> schemas.PageResponse:
        await PagePolicy(user=user).check_permission(
            action=ResourceAction.CREATE, page_data=page_data
        )

        owner_sub = user[0].get("sub") if page_data.owner == "me" else page_data.owner
        await self._ensure_user_exists(owner_sub)

        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            owned = await repo.count_owned_pages(owner_sub)
            if owned >= MAX_PAGES_PER_OWNER:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"This account already owns the maximum of " f"{MAX_PAGES_PER_OWNER} pages."
                    ),
                )
            page_data.owner = owner_sub
            page: Page = await repo.add_page(page_data)
        await repo.upsert_search(infra.meilisearch_client, page)
        return await self._build_page_response(page, infra, user)

    async def update_page(
        self,
        infra: Infra,
        slug: str,
        new_data: schemas.PageUpdateRequest,
        user: tuple[dict, dict],
    ) -> schemas.PageResponse:
        media_ids_to_delete = new_data.media_ids_to_delete or []
        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            page = await repo.get_by_slug(slug)
            if page is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
            is_page_admin = await repo.is_admin(page.id, user[0]["sub"])
            await PagePolicy(user=user, is_page_admin=is_page_admin).check_permission(
                action=ResourceAction.UPDATE, page=page, page_data=new_data
            )
            page = await repo.update_page(page=page, new_data=new_data)
        await repo.upsert_search(infra.meilisearch_client, page)

        if media_ids_to_delete:
            await self._delete_page_media(infra, page, media_ids_to_delete)

        return await self._build_page_response(page, infra, user)

    async def authorize_media_upload(
        self, page_id: int, user: tuple[dict, dict], count: int = 1
    ) -> None:
        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            page = await repo.get_by_id(page_id)
            if page is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
            is_page_admin = await repo.is_admin(page.id, user[0]["sub"])
            await PagePolicy(user=user, is_page_admin=is_page_admin).check_permission(
                action=ResourceAction.UPDATE, page=page
            )
            existing = await repo.count_page_images(page_id)
        # ponytail: the count is read before GCS's Pub/Sub hook inserts the rows,
        # so two concurrent batches can overshoot the cap by `count`. Acceptable;
        # enforce it again on the media row if that ever matters.
        if existing + count > MAX_PAGE_IMAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"A page can have at most {MAX_PAGE_IMAGES} content images; "
                    f"this page already has {existing}."
                ),
            )

    async def _delete_page_media(
        self,
        infra: Infra,
        page: Page,
        media_ids: List[int],
    ) -> None:
        await delete_owned_media(
            self.media_attachment_resolver, media_ids, EntityType.pages, page.id
        )

    async def delete_page(self, infra: Infra, slug: str, user: tuple[dict, dict]) -> None:
        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            page = await repo.get_by_slug(slug)
            if page is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
            is_page_admin = await repo.is_admin(page.id, user[0]["sub"])
            await PagePolicy(user=user, is_page_admin=is_page_admin).check_permission(
                action=ResourceAction.DELETE, page=page
            )
            media_objects: List[Media] = await repo.list_media(page_ids=[page.id])
            if not await repo.delete_page(page):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
        await self.media_attachment_resolver.delete_many(media_objects)
        await repo.delete_from_search(infra.meilisearch_client, page.id)

    async def reassign_owner(
        self, infra: Infra, slug: str, new_owner_sub: str, user: tuple[dict, dict]
    ) -> schemas.PageResponse:
        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            page = await repo.get_by_slug(slug)
            if page is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
            is_page_admin = await repo.is_admin(page.id, user[0]["sub"])
            await PagePolicy(user=user, is_page_admin=is_page_admin).check_manage_admins(page)
            target_user = await repo.get_user_by_sub(new_owner_sub)
            if target_user is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found"
                )
            # An owner cannot also be a page admin — drop the row if present.
            if new_owner_sub != user[0]["sub"] and await repo.is_admin(page.id, new_owner_sub):
                await repo.remove_admin(page.id, new_owner_sub)
            # The outgoing owner keeps the editor rather than being cut off from
            # the page they built. Idempotent if they were already an admin.
            if page.owner and page.owner != new_owner_sub:
                await repo.promote_to_admin(page.id, page.owner)
            page.owner = new_owner_sub
        await repo.upsert_search(infra.meilisearch_client, page)
        return await self._build_page_response(page, infra, user)

    async def list_pages(
        self,
        infra: Infra,
        user: tuple[dict, dict],
        *,
        page: int,
        size: int,
        owner_sub: str | None,
        role: str | None,
        keyword: str | None,
    ) -> schemas.ListPage:
        await PagePolicy(user=user).check_permission(action=ResourceAction.READ)

        owner_sub = user[0].get("sub") if owner_sub == "me" else owner_sub

        admin_page_ids: set[int] = set()
        is_guest = bool(user[1].get("is_guest"))

        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            if not is_guest:
                admin_page_ids = await repo.admin_page_ids(user[0]["sub"])
            pages, count, keyword_no_results = await repo.list_pages(
                page=page,
                size=size,
                viewer_sub=None if is_guest else user[0]["sub"],
                is_site_admin=self._is_site_admin(user),
                owner_sub=owner_sub,
                role=role,
                keyword=keyword,
                meilisearch_client=infra.meilisearch_client,
            )
            media_objs: List[Media] = await repo.list_media(
                page_ids=[page.id for page in pages],
                media_formats=[MediaFormat.profile, MediaFormat.banner],
            )

        if keyword_no_results:
            return schemas.ListPage(
                items=[],
                total_pages=1,
                total=0,
                page=page,
                size=size,
                has_next=False,
            )

        media_results: List[List[MediaResponse]] = (
            await self.media_attachment_resolver.map_to_resources(
                media_objects=media_objs, resources=pages
            )
        )

        page_responses: List[schemas.PageResponse] = [
            response_builder.build_schema(
                schemas.PageResponse,
                schemas.PageResponse.model_validate(page),
                media=media,
                permissions=get_page_permissions(page, user, admin_page_ids=admin_page_ids),
            )
            for page, media in zip(pages, media_results)
        ]

        total_pages: int = response_builder.calculate_pages(count=count, size=size)
        return schemas.ListPage(
            items=page_responses,
            total_pages=total_pages,
            total=count,
            page=page,
            size=size,
            has_next=page < total_pages,
        )

    async def get_page_response(
        self, infra: Infra, slug: str, user: tuple[dict, dict]
    ) -> schemas.PageResponse:
        page, policy = await self._load_page_and_policy(slug, user)
        await policy.check_permission(action=ResourceAction.READ, page=page)
        return await self._build_page_response(page, infra, user)

    async def get_page_response_by_id(
        self, infra: Infra, page_id: int, user: tuple[dict, dict]
    ) -> schemas.PageResponse:
        """Same as `get_page_response`, for callers that hold an id and not a slug.

        The OG routes are addressed by `?id=`, and the frontend and the Telegram
        preview URL both build them that way.
        """
        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            page = await repo.get_by_id(page_id)
            if page is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
            is_page_admin = await repo.is_admin(page.id, user[0]["sub"])
        await PagePolicy(user=user, is_page_admin=is_page_admin).check_permission(
            action=ResourceAction.READ, page=page
        )
        return await self._build_page_response(page, infra, user)

    @staticmethod
    def _to_admin_responses(admins: List[PageAdmin]) -> List[schemas.AdminResponse]:
        return [
            schemas.AdminResponse(
                sub=admin.user_sub,
                name=admin.user.name,
                surname=admin.user.surname,
                picture=admin.user.picture,
                created_at=admin.created_at,
            )
            for admin in admins
        ]

    async def _build_page_response(
        self, page: Page, infra: Infra, user: tuple[dict, dict]
    ) -> schemas.PageResponse:
        user_is_admin = False
        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            page = await repo.get_by_id(page.id)
            if page is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
            await repo.load_relations(page, ["owner_user"])
            user_is_admin = await repo.is_admin(page.id, user[0]["sub"])
            media_objs: List[Media] = await repo.list_media(
                page_ids=[page.id],
                media_formats=[MediaFormat.profile, MediaFormat.banner],
            )
        media_results: List[List[MediaResponse]] = (
            await self.media_attachment_resolver.map_to_resources(
                media_objects=media_objs, resources=[page]
            )
        )

        admin_page_ids = {page.id} if user_is_admin else set()

        return response_builder.build_schema(
            schemas.PageResponse,
            schemas.PageResponse.model_validate(page),
            owner_user=(
                ShortUserResponse.model_validate(page.owner_user) if page.owner_user else None
            ),
            media=media_results[0] if media_results else [],
            permissions=get_page_permissions(page, user, admin_page_ids=admin_page_ids),
        )

    @staticmethod
    def _hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode()).hexdigest()

    async def _issue_admin_link(
        self, infra: Infra, page: Page, user: tuple[dict, dict]
    ) -> schemas.AdminLinkResponse:
        """
        Revoke any active link and create a fresh one, returning its URL.
        """
        raw_token = secrets.token_urlsafe(32)
        token_hash = self._hash_token(raw_token)
        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            active = await repo.get_active_admin_link(page.id)
            if active is not None:
                await repo.revoke_admin_link(active)
            await repo.create_admin_link(page.id, token_hash, user[0]["sub"])
        return schemas.AdminLinkResponse(url=self._build_admin_link_url(infra, page, raw_token))

    async def view_admin_link(
        self, infra: Infra, slug: str, user: tuple[dict, dict]
    ) -> schemas.AdminLinkResponse:
        page, policy = await self._load_page_and_policy(slug, user)
        await policy.check_admin_link(page)
        # If a link were already active we could only show its hash back, not the
        # raw shareable token — so viewing lazily issues a fresh link either way.
        return await self._issue_admin_link(infra, page, user)

    async def rotate_admin_link(
        self, infra: Infra, slug: str, user: tuple[dict, dict]
    ) -> schemas.AdminLinkResponse:
        page, policy = await self._load_page_and_policy(slug, user)
        await policy.check_admin_link(page)
        return await self._issue_admin_link(infra, page, user)

    async def accept_admin_link(
        self, infra: Infra, token: str, user: tuple[dict, dict]
    ) -> schemas.AdminLinkAcceptResponse:
        token_hash = self._hash_token(token)
        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            link = await repo.get_admin_link_by_token_hash(token_hash)
            if link is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Invite link not found"
                )
            if link.revoked_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_410_GONE, detail="Invite link has been revoked"
                )
            page = await repo.get_by_id(link.page_id)
            if page is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
            user_sub = user[0]["sub"]
            if page.owner == user_sub:
                return schemas.AdminLinkAcceptResponse(status="already_owner")
            if await repo.is_admin(link.page_id, user_sub):
                return schemas.AdminLinkAcceptResponse(status="already_admin")
            await repo.add_admin(link.page_id, user_sub)
        return schemas.AdminLinkAcceptResponse(status="granted")

    async def list_admins(
        self,
        slug: str,
        user: tuple[dict, dict],
        *,
        page: int,
        size: int,
        exclude_sub: str | None = None,
    ) -> schemas.ListPageAdmins:
        page_obj, policy = await self._load_page_and_policy(slug, user)
        # can_edit, not READ: READ is visibility, and visibility is granted to
        # every signed-in user, so gating the admin list on it lets anyone
        # enumerate any page's team.
        await policy.check_permission(action=ResourceAction.UPDATE, page=page_obj)
        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            admins, count = await repo.list_admins_page(
                page_obj.id, page=page, size=size, exclude_sub=exclude_sub
            )
        return schemas.ListPageAdmins(
            items=self._to_admin_responses(admins),
            total=count,
            page=page,
            size=size,
            total_pages=response_builder.calculate_pages(count, size),
            has_next=page * size < count,
        )

    async def remove_admin(
        self, infra: Infra, slug: str, user_sub: str, user: tuple[dict, dict]
    ) -> schemas.PageResponse:
        page, policy = await self._load_page_and_policy(slug, user)
        await policy.check_manage_admins(page)

        if user_sub == user[0]["sub"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use the leave action to remove yourself",
            )
        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            if not await repo.remove_admin(page.id, user_sub):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        return await self._build_page_response(page, infra, user)

    async def leave_admin(
        self, infra: Infra, slug: str, user: tuple[dict, dict]
    ) -> schemas.PageResponse:
        page, policy = await self._load_page_and_policy(slug, user)
        await policy.check_self_leave(page)

        async with self.uow:
            repo = self.uow.get_repo(PageRepository)
            await repo.remove_admin(page.id, user[0]["sub"])
        return await self._build_page_response(page, infra, user)
