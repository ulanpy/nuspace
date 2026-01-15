from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session
from backend.modules.rejection_board import schemas
from backend.modules.rejection_board.service import RejectionBoardService


def get_rejection_board_filters(
    nickname: str | None = Query(default=None, description="Filter by nickname"),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(default=15, ge=1, le=100, description="Page size"),
) -> schemas.RejectionBoardFilter:
    return schemas.RejectionBoardFilter(
        nickname=nickname,
        page=page,
        size=size,
    )


def get_rejection_board_service(
    db: AsyncSession = Depends(get_db_session),
) -> RejectionBoardService:
    return RejectionBoardService(db_session=db)
