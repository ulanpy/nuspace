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

        if flt.nickname:
            stmt = stmt.where(RejectionBoard.nickname == flt.nickname)

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
        nickname: str,
    ) -> RejectionBoard:
        data = payload.model_dump()
        record = RejectionBoard(**data, nickname=nickname)
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record
