from fastapi import APIRouter, Request, HTTPException, Depends, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session, check_token
from typing import Annotated, List

from .cruds import add_new_club, add_new_event, get_club_events, get_event_db
from .schemas import ClubRequestSchema, ClubResponseSchema, ClubEventRequestSchema, ClubEventResponseSchema, ListEventSchema

router = APIRouter(tags=['Club Routes'])


@router.post("/clubs/add", response_model=ClubResponseSchema)
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


@router.post("/events/add", response_model=ClubEventResponseSchema)
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


@router.get("/clubs/{club_id}/events", response_model=ListEventSchema)
async def get_events(
    club_id: int,
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
    size: int = 20,
    page: int = 1,
) -> ListEventSchema:

    return await get_club_events(
        club_id=club_id,
        request=request,
        session=db_session,
        size=size,
        page=page
    )


@router.get("/events/{event_id}", response_model=ClubEventResponseSchema)
async def get_event(
    event_id: int,
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session)
) -> ClubEventResponseSchema:
    event = await get_event_db(event_id, request, db_session)
    if event:
        return event
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                        detail="such event does not exist")
