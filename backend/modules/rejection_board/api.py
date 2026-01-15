from fastapi import APIRouter, Depends, HTTPException, status

from backend.common.dependencies import get_creds_or_401
from backend.modules.rejection_board import schemas
from backend.modules.rejection_board.dependencies import (
    get_rejection_board_filters,
    get_rejection_board_service,
)
from backend.modules.rejection_board.service import RejectionBoardService

router = APIRouter(prefix="/rejection-board", tags=["Rejection Board"])


@router.get("", response_model=schemas.RejectionBoardListResponse)
async def list_rejection_posts(
    filters: schemas.RejectionBoardFilter = Depends(get_rejection_board_filters),
    service: RejectionBoardService = Depends(get_rejection_board_service),
):
    return await service.list(filters)


@router.post("", response_model=schemas.RejectionBoardResponseDTO, status_code=status.HTTP_201_CREATED)
async def create_rejection_post(
    payload: schemas.RejectionBoardCreateDTO,
    user=Depends(get_creds_or_401),
    service: RejectionBoardService = Depends(get_rejection_board_service),
):
    user_sub = (user[0] or {}).get("sub")
    if not user_sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User sub missing")
    return await service.create(payload=payload, user_sub=user_sub)
