from typing import List, Optional, Tuple

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models import OpportunityDigest
from backend.modules.opportunities_digest import schemas
from datetime import date


class OpportunitiesDigestService:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def list(self, flt: schemas.OpportunityDigestFilter) -> Tuple[List[OpportunityDigest], int]:
        stmt = select(OpportunityDigest)

        if flt.type:
            stmt = stmt.where(OpportunityDigest.type == flt.type)
        if flt.majors:
            stmt = stmt.where(OpportunityDigest.majors.ilike(f"%{flt.majors}%"))
        if flt.eligibility:
            stmt = stmt.where(OpportunityDigest.eligibility.ilike(f"%{flt.eligibility}%"))
        if flt.q:
            pattern = f"%{flt.q}%"
            stmt = stmt.where(
                (OpportunityDigest.name.ilike(pattern))
                | (OpportunityDigest.description.ilike(pattern))
            )
        if flt.hide_expired:
            today = date.today()
            stmt = stmt.where(
                (OpportunityDigest.deadline.is_(None))
                | (OpportunityDigest.deadline >= today)
            )

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one() or 0

        stmt = stmt.order_by(
            OpportunityDigest.deadline.is_(None),
            OpportunityDigest.deadline,
            OpportunityDigest.id,
        )

        offset_val = (flt.page - 1) * flt.size
        stmt = stmt.offset(offset_val).limit(flt.size)

        result = await self.db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def get(self, id: int) -> Optional[OpportunityDigest]:
        result = await self.db.execute(
            select(OpportunityDigest).where(OpportunityDigest.id == id)
        )
        return result.scalar_one_or_none()

    async def create(self, payload: schemas.OpportunityDigestCreate) -> OpportunityDigest:
        record = OpportunityDigest(**payload.model_dump())
        self.db.add(record)
        await self.db.flush()
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def update(
        self, id: int, payload: schemas.OpportunityDigestUpdate
    ) -> Optional[OpportunityDigest]:
        data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
        if not data:
            return await self.get(id)
        await self.db.execute(
            update(OpportunityDigest).where(OpportunityDigest.id == id).values(**data)
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
