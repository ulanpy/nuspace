from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import check_token, get_db_session

from ...common.utils import add_meilisearch_data, search_for_meilisearch_data
from ...core.database.models.club import ClubType, EventPolicy
from .cruds import (
    add_new_club,
    add_new_event,
    get_all_clubs,
    get_all_events,
    get_club_events,
    get_event_db,
)
from .enums import OrderEvents
from .schemas import (
    ClubEventRequestSchema,
    ClubEventResponseSchema,
    ClubRequestSchema,
    ClubResponseSchema,
    ListClubSchema,
    ListEventSchema,
)
from .utils import show_events_for_search

router = APIRouter(tags=["Club Routes"])


@router.post("/clubs/add", response_model=ClubResponseSchema)
async def add_club(
    request: Request,
    club: ClubRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubResponseSchema:
    try:
        return await add_new_club(request, club, db_session)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="db rejected the request: probably there are duplication issues",
        )


@router.post("/events/add", response_model=ClubEventResponseSchema)
async def add_event(
    request: Request,
    event: ClubEventRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubEventResponseSchema:

    try:
        response_event = await add_new_event(request, event, db_session)
        await add_meilisearch_data(
            request=request,
            storage_name="events",
            json_values={
                "id": response_event.id,
                "name": event.name,
                "description": event.description,
            },
        )
        return response_event
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="probably non-exist club_id"
        )


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
        club_id=club_id, request=request, session=db_session, size=size, page=page
    )


@router.get("/events/{event_id}", response_model=ClubEventResponseSchema)
async def get_event(
    event_id: int,
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubEventResponseSchema:
    event = await get_event_db(event_id, request, db_session)
    if event:
        return event
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="such event does not exist"
    )


@router.post("/events/list", response_model=ListEventSchema)
async def get_events(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
    size: int = 20,
    page: int = 1,
    club_type: Optional[ClubType] = None,
    event_policy: Optional[EventPolicy] = None,
    order: Optional[OrderEvents] = None,
) -> ListEventSchema:

    return await get_all_events(
        request=request,
        session=db_session,
        size=size,
        page=page,
        club_type=club_type,
        event_policy=event_policy,
        order=order,
    )


@router.post("/clubs/list", response_model=ListClubSchema)
async def get_events(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
    size: int = 20,
    page: int = 1,
    club_type: Optional[ClubType] = None,
) -> ListClubSchema:
    return await get_all_clubs(
        request=request, session=db_session, size=size, page=page, club_type=club_type
    )


@router.post("/events/search/", response_model=ListEventSchema)
async def post_search(
    request: Request,
    keyword: str,
    user: Annotated[dict, Depends(check_token)],
    size: int = 20,
    page: int = 1,
    db_session=Depends(get_db_session),
) -> ListEventSchema:
    search_results = await search_for_meilisearch_data(
        keyword=keyword, request=request, page=page, size=size, storage_name="events"
    )
    event_ids: list[int] = [event["id"] for event in search_results["hits"]]

    return await show_events_for_search(
        request=request,
        session=db_session,
        size=size,
        num_of_products=search_results["estimatedTotalHits"],
        event_ids=event_ids,
    )
