from fastapi import APIRouter, Request, HTTPException, Depends, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session, check_token
from typing import Optional, Annotated, List

from .cruds import add_new_club, add_new_event
from .schemas import ClubRequestSchema, ClubResponseSchema, ClubEventRequestSchema, ClubEventResponseSchema

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
                            detail="db rejected the request: probably there are duplication issues")


@router.post("/events/add")
async def add_event(
    request: Request,
    event: ClubEventRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session)
) -> ClubEventResponseSchema:
    try:
        return await add_new_event(request, event, db_session)
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="probably non-exist club_id")


