from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import check_admin, check_token, get_db_session
from backend.common.utils import (
    add_meilisearch_data,
    search_for_meilisearch_data,
    update_meilisearch_data,
)
from backend.core.database.models.club import Club, ClubEvent, ClubType, EventPolicy
from backend.core.database.models.media import Media, MediaFormat, MediaTable
from backend.routes.clubs import cruds, utils
from backend.routes.clubs.enums import OrderEvents
from backend.routes.clubs.schemas import (
    ClubEventRequestSchema,
    ClubEventResponseSchema,
    ClubEventUpdateSchema,
    ClubRequestSchema,
    ClubResponseSchema,
    ClubUpdateSchema,
    ListClubSchema,
    ListEventSchema,
)
from backend.routes.clubs.utils import (
    build_club_response,
    build_club_responses,
    build_event_response,
    build_event_responses,
    build_media_responses,
    calculate_pages,
)
from backend.routes.google_bucket.schemas import MediaResponse

router = APIRouter(tags=["Club Routes"])


@router.get("/clubs", response_model=ListClubSchema)
async def get_clubs(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    size: int = 20,
    page: int = 1,
    club_type: Optional[ClubType] = None,
    db_session: AsyncSession = Depends(get_db_session),
) -> ListClubSchema:
    clubs: List[Club] = await cruds.get_clubs(
        session=db_session, size=size, page=page, club_type=club_type
    )

    clubs_responses: List[ClubResponseSchema] = await build_club_responses(
        request=request, clubs=clubs, get_media=cruds.get_media_responses, session=db_session
    )

    count: int = await cruds.get_count(model=Club, session=db_session)
    num_of_pages: int = calculate_pages(count=count, size=size)

    return ListClubSchema(clubs=clubs_responses, num_of_pages=num_of_pages)


@router.post("/clubs", response_model=ClubResponseSchema)
async def add_club(
    request: Request,
    club_data: ClubRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubResponseSchema:
    try:
        club: Club = await cruds.add_club(club_data, db_session)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="db rejected the request: probably there are issues with president field",
        )

    media_objects: List[Media] = await cruds.get_media_responses(
        session=db_session,
        entity_id=club.id,
        media_format=MediaFormat.carousel,
        media_table=MediaTable.clubs,
    )
    media_responses: List[MediaResponse] = await build_media_responses(
        request=request, media_objects=media_objects
    )
    return await build_club_response(club=club, media_responses=media_responses)


@router.patch("/clubs", response_model=ClubResponseSchema)
async def update_club(
    request: Request,
    club_id: int,
    new_data: ClubUpdateSchema,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubResponseSchema:
    club: Club = await cruds.get_club(db_session, club_id)
    if club is None:
        raise HTTPException(status_code=404, detail="Club not found")
    new_club: Club = await cruds.update_club(session=db_session, new_data=new_data, club=club)

    media_objects: List[Media] = await cruds.get_media_responses(
        session=db_session,
        entity_id=club_id,
        media_format=MediaFormat.profile,
        media_table=MediaTable.clubs,
    )
    media_responses: List[MediaResponse] = await build_media_responses(
        request=request, media_objects=media_objects
    )
    return await build_club_response(club=new_club, media_responses=media_responses)


@router.delete("/clubs", status_code=status.HTTP_204_NO_CONTENT)
async def delete_club(
    request: Request,
    club_id: int,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
):
    club: Club = await cruds.get_club(db_session, club_id)
    if club is None:
        raise HTTPException(status_code=404, detail="Club not found")
    await cruds.delete_club(session=db_session, club=club)


@router.get("/events", response_model=ListEventSchema)
async def get_events(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    size: int = 20,
    page: int = 1,
    club_type: Optional[ClubType] = None,
    event_policy: Optional[EventPolicy] = None,
    order: Optional[OrderEvents] = OrderEvents.event_datetime,
    db_session: AsyncSession = Depends(get_db_session),
) -> ListEventSchema:
    events: List[ClubEvent] = await cruds.get_events(
        session=db_session,
        size=size,
        page=page,
        club_type=club_type,
        event_policy=event_policy,
        order=order,
    )

    event_responses: List[ClubEventResponseSchema] = await build_event_responses(
        request=request, events=events, get_media=cruds.get_media_responses, session=db_session
    )

    count: int = await cruds.get_count(model=ClubEvent, session=db_session)
    num_of_pages: int = calculate_pages(count=count, size=size)

    return ListEventSchema(events=event_responses, num_of_pages=num_of_pages)


@router.post("/events", response_model=ClubEventResponseSchema)
async def add_event(
    request: Request,
    event: ClubEventRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubEventResponseSchema:

    try:
        new_event: ClubEvent = await cruds.add_event(event_data=event, session=db_session)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="probably non-exist club_id"
        )
    await add_meilisearch_data(
        request=request,
        storage_name="events",
        json_values={
            "id": new_event.id,
            "name": event.name,
            "description": event.description,
        },
    )

    media_objects: List[Media] = await cruds.get_media_responses(
        session=db_session,
        entity_id=new_event.id,
        media_format=MediaFormat.carousel,
        media_table=MediaTable.club_events,
    )
    media_responses: List[MediaResponse] = await build_media_responses(
        request=request, media_objects=media_objects
    )
    return await build_event_response(event=new_event, media_responses=media_responses)


@router.patch("/events", response_model=ClubEventResponseSchema)
async def update_event(
    request: Request,
    event_id: int,
    new_data: ClubEventUpdateSchema,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubEventResponseSchema:
    event: ClubEvent = await cruds.get_event(db_session, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    if new_data.name or new_data.description:
        await update_meilisearch_data(
            request=request,
            storage_name="events",
            json_values={
                "id": event_id,
                "name": new_data.name,
                "description": new_data.description,
            },
        )
    new_event: ClubEvent = await cruds.update_event(
        session=db_session, new_data=new_data, event=event
    )
    media_objects: List[Media] = await cruds.get_media_responses(
        session=db_session,
        entity_id=event_id,
        media_format=MediaFormat.carousel,
        media_table=MediaTable.club_events,
    )
    media_responses: List[MediaResponse] = await build_media_responses(
        request=request, media_objects=media_objects
    )
    return await build_event_response(event=new_event, media_responses=media_responses)


@router.delete("/events", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    request: Request,
    event_id: int,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
):
    event: ClubEvent = await cruds.get_event(db_session, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    await cruds.delete_event(session=db_session, event=event)


@router.get("/events/search/", response_model=ListEventSchema)
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

    events: List[ClubEvent] = await cruds.get_certain_events(
        session=db_session, event_ids=event_ids
    )

    event_responses: List[ClubEventResponseSchema] = await build_event_responses(
        request=request, events=events, get_media=cruds.get_media_responses, session=db_session
    )

    count: int = await cruds.get_count(model=ClubEvent, session=db_session)
    num_of_pages: int = calculate_pages(count=count, size=size)
    return ListEventSchema(events=event_responses, num_of_pages=num_of_pages)


@router.get("/events/pre_search/", response_model=List[str])
async def pre_search(
    request: Request, keyword: str, user: Annotated[dict, Depends(check_token)]
) -> List[str]:
    return await utils.pre_search(request=request, keyword=keyword)


@router.get("/clubs/{club_id}/events", response_model=ListEventSchema)
async def get_club_events(
    request: Request,
    club_id: int,
    user: Annotated[dict, Depends(check_token)],
    size: int = 20,
    page: int = 1,
    db_session: AsyncSession = Depends(get_db_session),
) -> ListEventSchema:
    club: Club = await cruds.get_club(db_session, club_id)
    if club is None:
        raise HTTPException(status_code=404, detail="Club not found")

    events: List[ClubEvent] = await cruds.get_club_events(
        club_id=club_id, session=db_session, size=size, page=page
    )

    event_responses: List[ClubEventResponseSchema] = await build_event_responses(
        request=request, events=events, get_media=cruds.get_media_responses, session=db_session
    )

    count: int = await cruds.get_count(model=ClubEvent, session=db_session)
    num_of_pages: int = calculate_pages(count=count, size=size)
    return ListEventSchema(events=event_responses, num_of_pages=num_of_pages)


@router.get("/events/{event_id}", response_model=ClubEventResponseSchema)
async def get_event(
    event_id: int,
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubEventResponseSchema:
    event: ClubEvent = await cruds.get_event(session=db_session, event_id=event_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="such event does not exist"
        )

    media_objects: List[Media] = await cruds.get_media_responses(
        session=db_session,
        entity_id=event_id,
        media_format=MediaFormat.carousel,
        media_table=MediaTable.club_events,
    )
    media_responses: List[MediaResponse] = await build_media_responses(
        request=request, media_objects=media_objects
    )
    return await build_event_response(event=event, media_responses=media_responses)
