from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import check_token, get_db_session

from ...common.utils import add_meilisearch_data, search_for_meilisearch_data
from ...core.database.models.club import ClubType, EventPolicy
from ...core.database.models.media import MediaFormat, MediaTable
from ..clubs import cruds
from .enums import OrderEvents
from .schemas import (
    ClubEventRequestSchema,
    ClubEventResponseSchema,
    ClubRequestSchema,
    ClubResponseSchema,
    ClubUpdateSchema,
    ListClubSchema,
    ListEventSchema,
)

router = APIRouter(tags=["Club Routes"])


@router.get("/clubs", response_model=ListClubSchema)
async def get_сlubs(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
    size: int = 20,
    page: int = 1,
    club_type: Optional[ClubType] = None,
) -> ListClubSchema:
    return await cruds.get_all_clubs(
        request=request, session=db_session, size=size, page=page, club_type=club_type
    )


@router.post("/clubs", response_model=ClubResponseSchema)
async def add_club(
    request: Request,
    club: ClubRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubResponseSchema:
    try:
        return await cruds.add_new_club(request, club, db_session)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="db rejected the request: probably there are duplication issues",
        )


@router.patch("/clubs", response_model=ClubResponseSchema)
async def update_club(
    request: Request,
    club_id: int,
    new_data: ClubUpdateSchema,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubResponseSchema:
    club = await cruds.get_club_by_id(db_session, club_id)
    if club is None:
        raise HTTPException(status_code=404, detail="Club not found")
    return await cruds.update_club(
        request=request, session=db_session, new_data=new_data, club=club
    )


@router.delete("/clubs", status_code=status.HTTP_204_NO_CONTENT)
async def delete_club(
    request: Request,
    club_id: int,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
):
    club = await cruds.get_club_by_id(db_session, club_id)
    if club is None:
        raise HTTPException(status_code=404, detail="Club not found")
    await cruds.delete_club(request=request, session=db_session, club=club)


@router.post("/events/add", response_model=ClubEventResponseSchema)
async def add_event(
    request: Request,
    event: ClubEventRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubEventResponseSchema:

    try:
        response_event = await cruds.add_new_event(request, event, db_session)
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


@router.get("/events/list", response_model=ListEventSchema)
async def get_events(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
    size: int = 20,
    page: int = 1,
    club_type: Optional[ClubType] = None,
    event_policy: Optional[EventPolicy] = None,
    order: Optional[OrderEvents] = OrderEvents.event_datetime,
) -> ListEventSchema:

    return await cruds.get_all_events(
        request=request,
        session=db_session,
        size=size,
        page=page,
        club_type=club_type,
        event_policy=event_policy,
        order=order,
    )


@router.get("/events/search/", response_model=ListEventSchema)
async def post_search(
    request: Request,
    keyword: str,
    user: Annotated[dict, Depends(check_token)],
    size: int = 20,
    page: int = 1,
    db_session=Depends(get_db_session),
    media_table: MediaTable = MediaTable.club_events,
    media_format: MediaFormat = MediaFormat.carousel,
) -> ListEventSchema:
    search_results = await search_for_meilisearch_data(
        keyword=keyword, request=request, page=page, size=size, storage_name="events"
    )
    event_ids: list[int] = [event["id"] for event in search_results["hits"]]

    num_of_pages = max(1, (search_results["estimatedTotalHits"] + size - 1) // size)

    events_response = await cruds.get_certain_events(
        request, db_session, event_ids, media_table, media_format
    )
    return ListEventSchema(events=events_response, num_of_pages=num_of_pages)


@router.get("/clubs/{club_id}/events", response_model=ListEventSchema)
async def get_events_of_club(
    club_id: int,
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
    size: int = 20,
    page: int = 1,
) -> ListEventSchema:

    return await cruds.get_club_events(
        club_id=club_id, request=request, session=db_session, size=size, page=page
    )


@router.get("/events/{event_id}", response_model=ClubEventResponseSchema)
async def get_event(
    event_id: int,
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
    media_table: MediaTable = MediaTable.club_events,
    media_format: MediaFormat = MediaFormat.carousel,
) -> ClubEventResponseSchema:
    event: List[ClubEventResponseSchema] = await cruds.get_certain_events(
        request=request,
        session=db_session,
        event_ids=[event_id],
        media_table=media_table,
        media_format=media_format,
    )
    if event:
        return event[0]
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="such event does not exist")
