from typing import List, Tuple

from datetime import date
from sqlalchemy import func, select, update, exists, case, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from httpx import AsyncClient

from backend.common.utils import meilisearch
from backend.core.database.models import Opportunity, OpportunityEligibility, OpportunityMajorMap, EducationLevel
from backend.modules.opportunities import schemas


class OpportunitiesRepository:
    def __init__(self, db_session: AsyncSession, meilisearch_client: AsyncClient):
        self.db = db_session
        self.meilisearch_client = meilisearch_client

    async def list(self, flt: schemas.OpportunityFilter) -> Tuple[List[Opportunity], int]:
        """
        Use Meilisearch for keyword search, then filter in DB.
        Fallback to DB-only filtering when no keyword.
        """
        # If keyword, use it for id list + total
        if flt.q:
            meili_result = await meilisearch.get(
                client=self.meilisearch_client,
                storage_name=Opportunity.__tablename__,
                keyword=flt.q,
                page=flt.page,
                size=flt.size,
            )
            hits = meili_result.get("hits", []) or []
            ids = [hit.get("id") for hit in hits if hit.get("id") is not None]
            total = meili_result.get("estimatedTotalHits", len(ids))

            if not ids:
                return [], total

            stmt = (
                select(Opportunity)
                .where(Opportunity.id.in_(ids))
                .options(
                    selectinload(Opportunity.eligibilities),
                    selectinload(Opportunity.majors),
                )
            )

            if flt.type:
                stmt = stmt.where(Opportunity.type.in_(flt.type))
            if flt.majors:
                stmt = stmt.where(
                    exists(
                        select(OpportunityMajorMap.id).where(
                            OpportunityMajorMap.opportunity_id == Opportunity.id,
                            OpportunityMajorMap.major.in_(flt.majors),
                        )
                    )
                )
            if flt.education_level or flt.years:
                oe = OpportunityEligibility
                sub_conditions = []
                if flt.education_level:
                    sub_conditions.append(oe.education_level.in_(flt.education_level))
                if flt.years:
                    if flt.education_level and EducationLevel.PHD in flt.education_level:
                        sub_conditions.append(
                            or_(
                                oe.year.in_(flt.years),
                                and_(oe.education_level == EducationLevel.PHD, oe.year.is_(None)),
                            )
                        )
                    else:
                        sub_conditions.append(oe.year.in_(flt.years))
                stmt = stmt.where(
                    exists(
                        select(oe.id).where(
                            oe.opportunity_id == Opportunity.id,
                            *sub_conditions,
                        )
                    )
                )
            if flt.hide_expired:
                today = date.today()
                stmt = stmt.where(
                    (Opportunity.deadline.is_(None))
                    | (Opportunity.deadline >= today)
                )

            # preserve Meilisearch relevance order
            order_clause = case(
                *[
                    (Opportunity.id == oid, idx)
                    for idx, oid in enumerate(ids)
                ],
                else_=len(ids),
            )
            stmt = stmt.order_by(order_clause)

            result = await self.db.execute(stmt)
            items = list(result.scalars().all())
            return items, total

        # Fallback: DB filters without keyword search
        stmt = (
            select(Opportunity).options(
                selectinload(Opportunity.eligibilities),
                selectinload(Opportunity.majors),
            )
        )

        if flt.type:
            stmt = stmt.where(Opportunity.type.in_(flt.type))
        if flt.majors:
            stmt = stmt.where(
                exists(
                    select(OpportunityMajorMap.id).where(
                        OpportunityMajorMap.opportunity_id == Opportunity.id,
                        OpportunityMajorMap.major.in_(flt.majors),
                    )
                )
            )
        if flt.education_level or flt.years:
            oe = OpportunityEligibility
            sub_conditions = []
            if flt.education_level:
                sub_conditions.append(oe.education_level.in_(flt.education_level))
            if flt.years:
                if flt.education_level and EducationLevel.PHD in flt.education_level:
                    sub_conditions.append(
                        or_(
                            oe.year.in_(flt.years),
                            and_(oe.education_level == EducationLevel.PHD, oe.year.is_(None)),
                        )
                    )
                else:
                    sub_conditions.append(oe.year.in_(flt.years))
            stmt = stmt.where(
                exists(
                    select(oe.id).where(
                        oe.opportunity_id == Opportunity.id,
                        *sub_conditions,
                    )
                )
            )
        if flt.hide_expired:
            today = date.today()
            stmt = stmt.where(
                (Opportunity.deadline.is_(None))
                | (Opportunity.deadline >= today)
            )

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one() or 0

        stmt = stmt.order_by(
            Opportunity.deadline.is_(None),
            Opportunity.deadline,
            Opportunity.id,
        )

        offset_val = (flt.page - 1) * flt.size
        stmt = stmt.offset(offset_val).limit(flt.size)

        result = await self.db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def get(self, id: int) -> Opportunity | None:
        result = await self.db.execute(
            select(Opportunity).where(Opportunity.id == id)
        )
        return result.scalar_one_or_none()

    async def create(self, payload: schemas.OpportunityCreateDto) -> Opportunity:
        data = payload.model_dump()
        eligibility_data = data.pop("eligibilities", []) or []
        majors_data = data.pop("majors", []) or []
        record = Opportunity(**data)
        self.db.add(record)
        await self.db.flush()

        for item in eligibility_data:
            eligibility = OpportunityEligibility(
                opportunity_id=record.id,
                education_level=item["education_level"],
                year=item.get("year"),
            )
            self.db.add(eligibility)

        for major in majors_data:
            major_row = OpportunityMajorMap(opportunity_id=record.id, major=major)
            self.db.add(major_row)

        await self.db.commit()
        await self.db.refresh(record, attribute_names=["eligibilities", "majors"])
        return record

    async def update(self, id: int, payload: schemas.OpportunityUpdateDto) -> Opportunity | None:
        data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
        eligibility_data = data.pop("eligibilities", None)
        majors_data = data.pop("majors", None)

        if data:
            await self.db.execute(
                update(Opportunity).where(Opportunity.id == id).values(**data)
            )

        if eligibility_data is not None:
            # Replace eligibilities
            await self.db.execute(
                OpportunityEligibility.__table__.delete().where(
                    OpportunityEligibility.opportunity_id == id
                )
            )
            for item in eligibility_data:
                eligibility = OpportunityEligibility(
                    opportunity_id=id,
                    education_level=item["education_level"],
                    year=item.get("year"),
                )
                self.db.add(eligibility)

        if majors_data is not None:
            await self.db.execute(
                OpportunityMajorMap.__table__.delete().where(
                    OpportunityMajorMap.opportunity_id == id
                )
            )
            for major in majors_data:
                major_row = OpportunityMajorMap(opportunity_id=id, major=major)
                self.db.add(major_row)

        await self.db.commit()
        record = await self.get(id)
        await self.db.refresh(record, attribute_names=["eligibilities", "majors"])
        return record

    async def delete(self, id: int) -> bool:
        record = await self.get(id)
        if not record:
            return False
        await self.db.delete(record)
        await self.db.commit()
        return True

