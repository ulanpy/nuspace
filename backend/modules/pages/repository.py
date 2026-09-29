from typing import List, Literal, Tuple

from httpx import AsyncClient
from sqlalchemy import case, exists, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.common.datetime_utils import utc_now
from backend.common.utils import meilisearch
from backend.modules.auth.models import User
from backend.modules.media.models import EntityType, Media, MediaFormat
from backend.modules.pages.models.page import Page, PageAdmin, PageAdminLink, PageVisibility


class PageRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def add_page(self, page_data) -> Page:
        page = Page(**page_data.model_dump())
        self.db_session.add(page)
        await self.db_session.flush()
        stmt = select(Page).where(Page.id == page.id).options(selectinload(Page.owner_user))
        result = await self.db_session.execute(stmt)
        return result.scalars().one()

    async def update_page(self, page: Page, new_data) -> Page:
        for field, value in new_data.model_dump(
            exclude_unset=True, exclude={"media_ids_to_delete"}
        ).items():
            if hasattr(page, field):
                setattr(page, field, value)
        await self.db_session.flush()
        stmt = select(Page).where(Page.id == page.id).options(selectinload(Page.owner_user))
        result = await self.db_session.execute(stmt)
        return result.scalars().one()

    async def delete_page(self, page: Page) -> bool:
        try:
            await self.db_session.delete(page)
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
    async def upsert_search(meilisearch_client: AsyncClient, page: Page) -> None:
        await meilisearch.upsert(
            client=meilisearch_client,
            storage_name=Page.__tablename__,
            json_values={
                "id": page.id,
                "name": page.name,
            },
        )

    @staticmethod
    async def delete_from_search(meilisearch_client: AsyncClient, page_id: int) -> None:
        await meilisearch.delete(
            client=meilisearch_client,
            storage_name=Page.__tablename__,
            primary_key=str(page_id),
        )

    async def list_media(
        self,
        page_ids: List[int],
        media_formats: List[MediaFormat] | None = None,
    ) -> List[Media]:
        filters = [
            Media.entity_id.in_(page_ids),
            Media.entity_type == EntityType.pages,
        ]
        if media_formats:
            filters.append(Media.media_format.in_(media_formats))
        stmt = select(Media).where(*filters)
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def count_page_images(self, page_id: int) -> int:
        """Content images already attached to a page, for the per-page cap."""
        stmt = (
            select(func.count())
            .select_from(Media)
            .where(
                Media.entity_type == EntityType.pages,
                Media.entity_id == page_id,
                Media.media_format == MediaFormat.carousel,
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalar() or 0

    async def count_owned_pages(self, user_sub: str) -> int:
        stmt = select(func.count()).select_from(Page).where(Page.owner == user_sub)
        result = await self.db_session.execute(stmt)
        return result.scalar() or 0

    @classmethod
    def _list_conditions(
        cls, *, viewer_sub: str | None, is_site_admin: bool, scope: Literal["browsable", "mine"]
    ) -> list:
        """The whole WHERE of `list_pages`, as one method so the tests can call
        the real thing instead of restating it.

        They used to reimplement these lines, which meant the test file encoded
        the *intended* query while the repository ran the *actual* one and
        nothing checked the two agreed. One caller, one source of truth.

        The two scopes are not variations on one question, and the difference
        shows up here as the absence of a concept rather than a new one:

        - `mine` has no visibility filter at all. It is not "pages I may read,
          filtered to mine" — it is "pages I run", and every visibility belongs
          in it, `private` most of all. The only question is which pages those
          are, and it is answered entirely by the two relationships.
        - `browsable` has no relationship filter, and needs a site-admin
          bypass, because it is a visibility question about pages the caller
          does not run.

        Overlapping the two is what broke three times. An earlier version gave
        `mine` a visibility OR that contained `owner = me`, so the `role=admin`
        query was `(visible OR administered-by-me)` and `visible` already
        meant "or owned by me" — every owned page came back under both tabs.
        Deriving `owner_sub` was the same mistake: it is a visibility
        alternative smuggled into a relationship query.
        """
        if scope == "mine":
            return [
                or_(
                    Page.owner == viewer_sub,
                    Page.id.in_(select(PageAdmin.page_id).where(PageAdmin.user_sub == viewer_sub)),
                )
            ]
        if is_site_admin:
            return []
        if viewer_sub:
            return [Page.visibility.in_([PageVisibility.public, PageVisibility.internal])]
        return [Page.visibility == PageVisibility.public]

    async def list_pages(
        self,
        *,
        page: int,
        size: int,
        viewer_sub: str | None,
        is_site_admin: bool,
        scope: Literal["browsable", "mine"],
        keyword: str | None,
        meilisearch_client: AsyncClient,
    ) -> Tuple[List[Page], int, bool]:
        meili_result = None
        keyword_no_results = False

        if keyword:
            meili_result = await meilisearch.get(
                client=meilisearch_client,
                storage_name=EntityType.pages.value,
                keyword=keyword,
                page=page,
                size=size,
                filters=None,
            )
            page_ids = [item["id"] for item in meili_result.get("hits", [])]
            if not page_ids:
                estimated_hits = meili_result.get("estimatedTotalHits", 0) if meili_result else 0
                return [], estimated_hits, True

        conditions = self._list_conditions(
            viewer_sub=viewer_sub,
            is_site_admin=is_site_admin,
            scope=scope,
        )
        if keyword:
            conditions.append(Page.id.in_(page_ids))

        base_stmt = select(Page).where(*conditions).options(selectinload(Page.owner_user))

        if keyword:
            order_clause = case(
                *[(Page.id == page_id, index) for index, page_id in enumerate(page_ids)],
                else_=len(page_ids),
            )
            stmt = base_stmt.order_by(order_clause)
            result = await self.db_session.execute(stmt)
            pages: List[Page] = list(result.scalars().all())
            count: int = meili_result.get("estimatedTotalHits", 0) if meili_result else 0
        else:
            page_num = max(1, page or 1)
            has_media = exists(
                select(Media.id).where(
                    Media.entity_id == Page.id,
                    Media.entity_type == EntityType.pages,
                )
            )
            # The rows you run, in the order that answers "what is mine": the
            # pages you own before the ones you help run, then image-first,
            # then by name.
            order_clauses = [has_media.desc(), Page.name.asc()]
            if scope == "mine":
                order_clauses.insert(0, (Page.owner == viewer_sub).desc())
            stmt = base_stmt.order_by(*order_clauses).offset((page_num - 1) * size).limit(size)
            result = await self.db_session.execute(stmt)
            pages = list(result.scalars().all())
            count_stmt = select(func.count()).select_from(Page).where(*conditions)
            count_result = await self.db_session.execute(count_stmt)
            count = count_result.scalar() or 0

        return pages, count, keyword_no_results

    async def load_relations(self, page: Page, relations: list[str] | None = None) -> None:
        await self.db_session.refresh(page, relations or ["owner_user"])

    async def get_by_id(self, page_id: int) -> Page | None:
        stmt = select(Page).where(Page.id == page_id).options(selectinload(Page.owner_user))
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def get_by_slug(self, slug: str) -> Page | None:
        stmt = select(Page).where(Page.slug == slug).options(selectinload(Page.owner_user))
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def get_user_by_sub(self, sub: str) -> User | None:
        stmt = select(User).where(User.sub == sub)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def list_admins_page(
        self, page_id: int, *, page: int, size: int, exclude_sub: str | None = None
    ) -> Tuple[List[PageAdmin], int]:
        # created_at alone is not a stable sort: rows promoted in the same
        # transaction share a timestamp, and OFFSET pagination over a
        # non-deterministic order silently drops and repeats rows across
        # page boundaries. user_sub breaks the tie.
        conditions = [PageAdmin.page_id == page_id]
        if exclude_sub is not None:
            conditions.append(PageAdmin.user_sub != exclude_sub)
        stmt = (
            select(PageAdmin)
            .where(*conditions)
            .options(selectinload(PageAdmin.user))
            .order_by(PageAdmin.created_at.asc(), PageAdmin.user_sub.asc())
            .offset((page - 1) * size)
            .limit(size)
        )
        result = await self.db_session.execute(stmt)
        admins = list(result.scalars().all())
        count_stmt = select(func.count()).select_from(PageAdmin).where(*conditions)
        count_result = await self.db_session.execute(count_stmt)
        return admins, count_result.scalar() or 0

    async def add_admin(self, page_id: int, user_sub: str) -> PageAdmin:
        admin = PageAdmin(page_id=page_id, user_sub=user_sub)
        self.db_session.add(admin)
        await self.db_session.flush()
        stmt = (
            select(PageAdmin)
            .where(
                PageAdmin.page_id == page_id,
                PageAdmin.user_sub == user_sub,
            )
            .options(selectinload(PageAdmin.user))
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().one()

    async def promote_to_admin(self, page_id: int, user_sub: str) -> None:
        """Add an admin row, tolerating one that already exists.

        Used by ownership transfer, where the outgoing owner may already be an
        admin and the transfer must not blow up on the duplicate.
        """
        stmt = (
            insert(PageAdmin)
            .values(page_id=page_id, user_sub=user_sub, created_at=utc_now())
            .on_conflict_do_nothing(index_elements=["page_id", "user_sub"])
        )
        await self.db_session.execute(stmt)
        await self.db_session.flush()

    async def remove_admin(self, page_id: int, user_sub: str) -> bool:
        stmt = select(PageAdmin).where(
            PageAdmin.page_id == page_id,
            PageAdmin.user_sub == user_sub,
        )
        result = await self.db_session.execute(stmt)
        admin = result.scalars().first()
        if admin is None:
            return False
        await self.db_session.delete(admin)
        return True

    async def is_admin(self, page_id: int, user_sub: str) -> bool:
        stmt = select(PageAdmin).where(
            PageAdmin.page_id == page_id,
            PageAdmin.user_sub == user_sub,
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first() is not None

    async def admin_page_ids(self, user_sub: str) -> set[int]:
        stmt = select(PageAdmin.page_id).where(PageAdmin.user_sub == user_sub)
        result = await self.db_session.execute(stmt)
        return set(result.scalars().all())

    async def get_active_admin_link(self, page_id: int) -> PageAdminLink | None:
        stmt = select(PageAdminLink).where(
            PageAdminLink.page_id == page_id,
            PageAdminLink.revoked_at.is_(None),
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def create_admin_link(
        self, page_id: int, token_hash: str, created_by_sub: str
    ) -> PageAdminLink:
        link = PageAdminLink(
            page_id=page_id,
            token_hash=token_hash,
            created_by_sub=created_by_sub,
        )
        self.db_session.add(link)
        await self.db_session.flush()
        return link

    async def revoke_admin_link(self, link: PageAdminLink) -> None:
        link.revoked_at = utc_now()
        await self.db_session.flush()

    async def get_admin_link_by_token_hash(self, token_hash: str) -> PageAdminLink | None:
        stmt = select(PageAdminLink).where(PageAdminLink.token_hash == token_hash)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()
