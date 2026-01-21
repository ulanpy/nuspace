from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models import RejectionBoard
from backend.modules.rejection_board import schemas


class RejectionBoardRepository:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def list(
        self,
        *,
        flt: schemas.RejectionBoardFilter,
    ) -> tuple[list[RejectionBoard], int]:
        stmt = select(RejectionBoard)

        if flt.rejection_opportunity_type:
            stmt = stmt.where(
                RejectionBoard.rejection_opportunity_type == flt.rejection_opportunity_type
            )
        if flt.is_accepted:
            stmt = stmt.where(RejectionBoard.is_accepted == flt.is_accepted)
        if flt.still_trying:
            stmt = stmt.where(RejectionBoard.still_trying == flt.still_trying)

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one() or 0

        stmt = stmt.order_by(RejectionBoard.created_at.desc(), RejectionBoard.id.desc())
        offset_val = (flt.page - 1) * flt.size
        stmt = stmt.offset(offset_val).limit(flt.size)

        result = await self.db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def create(
        self,
        *,
        payload: schemas.RejectionBoardCreateDTO,
    ) -> RejectionBoard:
        data = payload.model_dump()
        record = RejectionBoard(**data)
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record
