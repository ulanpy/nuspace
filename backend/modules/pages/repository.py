from typing import List, Literal, Tuple

from httpx import AsyncClient
from sqlalchemy import case, exists, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute, selectinload

from backend.common.datetime_utils import utc_now
from backend.common.utils import meilisearch
from backend.modules.auth.models import User
from backend.modules.media.models import EntityType, Media, MediaFormat
from backend.modules.pages.constants import PageAdminSort, PageRole, PageSort
from backend.modules.pages.models.page import Page, PageAdmin, PageAdminLink, PageVisibility

# Sort columns are whitelisted, never interpolated into an `order_by` from a
# caller-supplied string. The keys are the `PageSort` members, so the value
# FastAPI already accepted and the column we order by cannot drift apart.
_PAGE_SORT_COLUMNS: dict[PageSort, InstrumentedAttribute] = {
    PageSort.name: Page.name,
    PageSort.created_at: Page.created_at,
    PageSort.visibility: Page.visibility,
}

# `visibility` is a Postgres enum, and `ORDER BY` on an enum sorts by
# *declaration* order — `private, internal, public` in
# `models/page.py:23-` — not alphabetically. Ascending is therefore
# narrowest -> broadest, which is a useful ladder: the most locked-down pages
# first. Do not "fix" this into `public` first; if a public-first ladder is
# ever wanted, reverse it explicitly and say why in the UI.
_ADMIN_SORT_COLUMNS: dict[PageAdminSort, InstrumentedAttribute] = {
    PageAdminSort.name: User.name,
    PageAdminSort.created_at: PageAdmin.created_at,
}


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
        cls,
        *,
        viewer_sub: str | None,
        is_site_admin: bool,
        scope: Literal["browsable", "mine"],
        role: PageRole | None = None,
        visibility: list[PageVisibility] | None = None,
    ) -> list:
        """The whole WHERE of `list_pages`, as one method so the tests can call
        the real thing instead of restating it.

        They used to reimplement these lines, which meant the test file encoded
        the *intended* query while the repository ran the *actual* one and
        nothing checked the two agreed. One caller, one source of truth.

        The two scopes are not variations on one question, and the difference
        shows up here as the absence of a concept rather than a new one:

        - `browsable` is a visibility question about pages the caller does not
          run. It has no relationship filter, and needs a site-admin bypass.
        - `mine` is "pages I run" — you own it, or you administer it — at every
          visibility. `private` belongs here and only here, because this is
          where you manage your pages.

        `role` and `visibility` narrow `mine` and are deliberately **not** a
        substitute for its visibility rule. The filter is an AND on top of the
        two relationships, never folded into the `or_()`: `?role=admin&
        visibility=private` is an intersection of "pages I administer" with
        "private", and a filter that could only narrow what the scope already
        allows cannot make the scope wider.

        ### `role=admin` means administered by me AND NOT owned by me

        This clause is the whole reason this docstring exists. Without it, a
        page you own *and* administer comes back under both `role=owner` and
        `role=admin` and the same row appears twice in the user's table, once
        under each filter. `b176a18` deleted the `role` filter entirely rather
        than fix that, and the reasoning it recorded is still the reasoning
        behind keeping this clause: the `role` filter is not the problem, the
        *overlap* is. Do not drop `is_distinct_from` to "simplify" it.

        `is_distinct_from`, not `!=`: `pages.owner` is nullable (`ON DELETE SET
        NULL`), and `owner != me` is NULL — therefore false — for a page whose
        owner has been removed, which would hide a page you genuinely
        administer. `IS DISTINCT FROM` treats NULL as "not you", which is what
        "NOT owned by me" means.

        ### Why these two scopes stopped overlapping

        An earlier version gave `mine` a visibility OR that contained
        `owner = me`, so the `role=admin` query compiled to `(visible OR
        administered-by-me)` and `visible` already meant "or owned by me" —
        every owned page came back under both tabs. That is the same leak as
        above, reached by a different route, and it is why the ownership
        alternative lives inside the `or_()` and the filters live outside it.
        Deriving `owner_sub` was the same mistake one step earlier: a
        visibility alternative smuggled into a relationship query.
        """
        if scope == "mine":
            administered = select(PageAdmin.page_id).where(PageAdmin.user_sub == viewer_sub)
            conditions = [or_(Page.owner == viewer_sub, Page.id.in_(administered))]
            if role == PageRole.owner:
                conditions.append(Page.owner == viewer_sub)
            elif role == PageRole.admin:
                conditions.extend(
                    [Page.id.in_(administered), Page.owner.is_distinct_from(viewer_sub)]
                )
            if visibility:
                conditions.append(Page.visibility.in_(visibility))
            return conditions
        # `browsable` ignores `role` and `visibility`: it is chosen by
        # visibility alone, and the directory has no relationship filter to
        # narrow. Only `/pages/mine` exposes those params, so this is
        # unreachable rather than a silent ignore — see the docstring.
        if is_site_admin:
            return []
        if viewer_sub:
            return [Page.visibility.in_([PageVisibility.public, PageVisibility.internal])]
        return [Page.visibility == PageVisibility.public]

    @classmethod
    def _page_order_clauses(
        cls,
        *,
        viewer_sub: str | None,
        scope: Literal["browsable", "mine"],
        sort: PageSort | None,
        order: Literal["asc", "desc"],
    ) -> list:
        """The whole ORDER BY of `list_pages`, for the same reason
        `_list_conditions` exists: the tests call this rather than restating
        it, so they cannot pass while the repository sorts something else.

        The default chain is load-bearing and must not be touched. It is the
        order the list has always had — the pages you own before the ones you
        help run, then image-first, then by name — and defaulting `sort` to
        `created_at` would silently reorder the table people already use, with
        no diff to show for it. So `sort=None` returns exactly that, and an
        explicit `sort` replaces the chain *including* the owner-first prefix:
        prefixing it would make "sort by name" owner-grouped, which is not a
        name sort.
        """
        if sort is None:
            has_media = exists(
                select(Media.id).where(
                    Media.entity_id == Page.id,
                    Media.entity_type == EntityType.pages,
                )
            )
            clauses = [has_media.desc(), Page.name.asc()]
            if scope == "mine":
                clauses.insert(0, (Page.owner == viewer_sub).desc())
            return clauses
        # `Page.id` is the tiebreaker for the same reason `PageAdmin.user_sub`
        # is one in `list_admins_page`: OFFSET pagination over a
        # non-deterministic order drops and repeats rows across page
        # boundaries, and `name` repeats.
        column = _PAGE_SORT_COLUMNS[sort]
        return [column.asc() if order == "asc" else column.desc(), Page.id.asc()]

    @classmethod
    def _admin_order_clauses(
        cls, *, sort: PageAdminSort | None, order: Literal["asc", "desc"]
    ) -> list:
        """The whole ORDER BY of `list_admins_page`.

        `PageAdmin.user_sub` is the last clause whichever key is asked for, and
        it is not a nicety: `created_at` is set in Python at insert time, so
        rows promoted in the same transaction share it, and OFFSET pagination
        over a non-deterministic order silently drops and repeats rows across
        page boundaries. The `name` sort repeats for the same reason.

        `name` lives on `users`, so this list joins there — unconditionally,
        because it is one indexed lookup on a table we load rows from anyway
        and a second code path for "the sort needs a join" is not worth it.
        """
        if sort is None:
            return [PageAdmin.created_at.asc(), PageAdmin.user_sub.asc()]
        column = _ADMIN_SORT_COLUMNS[sort]
        return [column.asc() if order == "asc" else column.desc(), PageAdmin.user_sub.asc()]

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
        role: PageRole | None = None,
        visibility: list[PageVisibility] | None = None,
        sort: PageSort | None = None,
        order: Literal["asc", "desc"] = "desc",
    ) -> Tuple[List[Page], int, bool]:
        meili_result = None
        keyword_no_results = False

        if keyword:
            # The Meilisearch path silently ignores `sort` and `visibility`:
            # it ranks by the `case()` below, and `MEILISEARCH_INDEXES` declares
            # `filterable_attributes=None`, so there is no facet to filter on
            # either. The caller cannot tell — no error, just wrong rows. `/pages/
            # mine` sends no `keyword` today, so this is unreachable; adding a
            # search box there means index facet config in `search_indexes.py`
            # plus a reindex, not just a UI control. See `api.py::get_my_pages`.
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
            role=role,
            visibility=visibility,
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
            order_clauses = self._page_order_clauses(
                viewer_sub=viewer_sub, scope=scope, sort=sort, order=order
            )
            stmt = base_stmt.order_by(*order_clauses).offset((page_num - 1) * size).limit(size)
            result = await self.db_session.execute(stmt)
            pages = list(result.scalars().all())
            # The COUNT reuses the same conditions, so a filtered list's `total`
            # and `has_next` are already right. Do not add a second where-clause
            # and do not "fix" the count separately.
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
        self,
        page_id: int,
        *,
        page: int,
        size: int,
        exclude_sub: str | None = None,
        sort: PageAdminSort | None = None,
        order: Literal["asc", "desc"] = "desc",
    ) -> Tuple[List[PageAdmin], int]:
        conditions = [PageAdmin.page_id == page_id]
        if exclude_sub is not None:
            conditions.append(PageAdmin.user_sub != exclude_sub)
        order_clauses = self._admin_order_clauses(sort=sort, order=order)
        stmt = (
            select(PageAdmin)
            .join(User, PageAdmin.user_sub == User.sub)
            .where(*conditions)
            .options(selectinload(PageAdmin.user))
            .order_by(*order_clauses)
            .offset((page - 1) * size)
            .limit(size)
        )
        result = await self.db_session.execute(stmt)
        admins = list(result.scalars().all())
        # Counted off the same conditions, so `exclude_sub` — and any future
        # filter — keeps `total` and `has_next` consistent with the rows. It
        # deliberately does not join `users`: nothing is ordered here.
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
