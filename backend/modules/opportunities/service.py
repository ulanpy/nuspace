from typing import List, Optional, Tuple

from sqlalchemy import func, select, update, exists
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models import Opportunity, OpportunityEligibility
from backend.modules.opportunities import schemas
from datetime import date


class OpportunitiesDigestService:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def list(self, flt: schemas.OpportunityFilter) -> Tuple[List[Opportunity], int]:
        stmt = select(Opportunity)

        if flt.type:
            stmt = stmt.where(Opportunity.type == flt.type)
        if flt.majors:
            stmt = stmt.where(Opportunity.majors.ilike(f"%{flt.majors}%"))
        if flt.q:
            pattern = f"%{flt.q}%"
            stmt = stmt.where(
                (Opportunity.name.ilike(pattern))
                | (Opportunity.description.ilike(pattern))
            )
        if flt.education_level or flt.min_year is not None or flt.max_year is not None:
            oe = OpportunityEligibility
            sub_conditions = []
            if flt.education_level:
                sub_conditions.append(oe.education_level == flt.education_level)
            if flt.min_year is not None:
                sub_conditions.append(oe.min_year >= flt.min_year)
            if flt.max_year is not None:
                sub_conditions.append(oe.max_year <= flt.max_year)
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

    async def get(self, id: int) -> Optional[Opportunity]:
        result = await self.db.execute(
            select(Opportunity).where(Opportunity.id == id)
        )
        return result.scalar_one_or_none()

    async def create(self, payload: schemas.OpportunityCreate) -> Opportunity:
        data = payload.model_dump()
        eligibility_data = data.pop("eligibility", []) or []
        record = Opportunity(**data)
        self.db.add(record)
        await self.db.flush()

        for item in eligibility_data:
            eligibility = OpportunityEligibility(
                opportunity_id=record.id,
                education_level=item["education_level"],
                min_year=item.get("min_year"),
                max_year=item.get("max_year"),
            )
            self.db.add(eligibility)

        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def update(
        self, id: int, payload: schemas.OpportunityUpdate
    ) -> Optional[Opportunity]:
        data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
        eligibility_data = data.pop("eligibility", None)

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
                    min_year=item.get("min_year"),
                    max_year=item.get("max_year"),
                )
                self.db.add(eligibility)

        await self.db.commit()
        return await self.get(id)

    async def delete(self, id: int) -> bool:
        record = await self.get(id)
        if not record:
            return False
        await self.db.delete(record)
        await self.db.commit()
        return True
