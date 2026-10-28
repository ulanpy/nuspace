"""Reads the records behind search hits, and the viewer's own non-public Sources.

Read-only, over the source modules' tables. Search owns no table: it reads what
it shows and decides who may see it at the moment of the search.
"""

from collections.abc import Collection, Sequence

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.modules.courses.models import Course, GradeReport
from backend.modules.events.models import Event, EventStatus
from backend.modules.opportunities.models import Opportunity
from backend.modules.pages.models import Page, PageAdmin, PageVisibility


class SearchRepository:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session

    async def managed_page_ids(
        self, viewer_sub: str, *, outside: Collection[PageVisibility]
    ) -> set[int]:
        """Pages the viewer owns or administers whose tier is not in `outside`."""
        administered = select(PageAdmin.page_id).where(PageAdmin.user_sub == viewer_sub)
        stmt = select(Page.id).where(
            or_(Page.owner == viewer_sub, Page.id.in_(administered)),
            Page.visibility.not_in(list(outside)),
        )
        return set((await self.db_session.execute(stmt)).scalars().all())

    async def own_event_ids(self, viewer_sub: str, *, outside: Collection[EventStatus]) -> set[int]:
        """Events the viewer created whose status is not in `outside`."""
        stmt = select(Event.id).where(
            Event.creator_sub == viewer_sub, Event.status.not_in(list(outside))
        )
        return set((await self.db_session.execute(stmt)).scalars().all())

    async def pages(self, ids: Sequence[int]) -> list[Page]:
        stmt = select(Page).where(Page.id.in_(ids)).options(selectinload(Page.owner_user))
        return list((await self.db_session.execute(stmt)).scalars().all())

    async def administered_among(self, viewer_sub: str, page_ids: Sequence[int]) -> set[int]:
        stmt = select(PageAdmin.page_id).where(
            PageAdmin.user_sub == viewer_sub, PageAdmin.page_id.in_(page_ids)
        )
        return set((await self.db_session.execute(stmt)).scalars().all())

    async def events(self, ids: Sequence[int]) -> list[Event]:
        stmt = select(Event).where(Event.id.in_(ids))
        return list((await self.db_session.execute(stmt)).scalars().all())

    async def opportunities(self, ids: Sequence[int]) -> list[Opportunity]:
        stmt = select(Opportunity).where(Opportunity.id.in_(ids))
        return list((await self.db_session.execute(stmt)).scalars().all())

    async def courses(self, ids: Sequence[int]) -> list[Course]:
        stmt = select(Course).where(Course.id.in_(ids))
        return list((await self.db_session.execute(stmt)).scalars().all())

    async def grade_reports(self, ids: Sequence[int]) -> list[GradeReport]:
        stmt = select(GradeReport).where(GradeReport.id.in_(ids))
        return list((await self.db_session.execute(stmt)).scalars().all())
