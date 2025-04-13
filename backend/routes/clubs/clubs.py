from fastapi import APIRouter, Request, HTTPException, Depends, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session, check_token
from typing import Annotated, List

from .cruds import add_new_club, get_club_events
from .schemas import ClubRequestSchema, ClubResponseSchema

router = APIRouter(tags=['Club Routes'])


@router.post("/clubs/add")
async def add_club(
    request: Request,
    club: ClubRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session)
) -> ClubResponseSchema:
    try:
        return await add_new_club(request, club, db_session)
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="db rejected the request: probably there are unique issues")


@router.post("/events/add")
async def add_event():
    pass

@router.get("/api/clubs/{club_id}/events")
async def get_events(
    club_id: int,
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
):

    return await get_club_events(club_id, request, db_session)

