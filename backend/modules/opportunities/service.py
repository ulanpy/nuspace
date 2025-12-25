from typing import List, Optional, Tuple

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models import Opportunity
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
        if flt.eligibility:
            stmt = stmt.where(Opportunity.eligibility.ilike(f"%{flt.eligibility}%"))
        if flt.q:
            pattern = f"%{flt.q}%"
            stmt = stmt.where(
                (Opportunity.name.ilike(pattern))
                | (Opportunity.description.ilike(pattern))
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
        record = Opportunity(**payload.model_dump())
        self.db.add(record)
        await self.db.flush()
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def update(
        self, id: int, payload: schemas.OpportunityUpdate
    ) -> Optional[Opportunity]:
        data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
        if not data:
            return await self.get(id)
        await self.db.execute(
            update(Opportunity).where(Opportunity.id == id).values(**data)
        )
        await self.db.commit()
        return await self.get(id)

    async def delete(self, id: int) -> bool:
        record = await self.get(id)
        if not record:
            return False
        await self.db.delete(record)
        await self.db.commit()
        return True
