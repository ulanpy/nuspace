from fastapi import APIRouter, Depends, status
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
    service: RejectionBoardService = Depends(get_rejection_board_service),
):
    return await service.create(payload=payload)
