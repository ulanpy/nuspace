from datetime import date
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import check_admin, check_token, get_db_session
from backend.common.schemas import MediaResponse
from backend.common.utils import meilisearch, response_builder
from backend.common.utils.enums import DateFilterEnum
from backend.core.database.models.club import Club, ClubEvent, ClubType, EventPolicy
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.routes.clubs import utils
from backend.routes.clubs.schemas import (
    ClubEventRequestSchema,
    ClubEventResponseSchema,
    ClubEventUpdateSchema,
    ListEventSchema,
)
from backend.routes.google_bucket.utils import delete_bucket_object

router = APIRouter(tags=["Events Routes"])


@router.get("/events", response_model=ListEventSchema)
async def get_events(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    club_type: Optional[ClubType] = None,
    event_policy: Optional[EventPolicy] = None,
    club_id: Optional[int] = None,
    date_filter: Optional[DateFilterEnum] = None,
    start_date: Optional[date] = Query(
        None,
        title="Start date",
        description="Дата начала диапазона (формат: YYYY-MM-DD)",
        example="2025-05-19",
    ),
    end_date: Optional[date] = Query(
        None,
        title="End date",
        description="Дата конца диапазона (формат: YYYY-MM-DD)",
        example="2025-05-25",
    ),
    keyword: str | None = None,
    db_session: AsyncSession = Depends(get_db_session),
) -> ListEventSchema:
    """
    Retrieves a paginated list of events with flexible filtering.

    **Parameters:**
    - `size`: Number of events per page (default: 20)
    - `page`: Page number (default: 1)
    - `club_type`: Filter by club type (optional)
    - `event_policy`: Filter by event policy (optional)
    - `club_id`: Filter by specific club (optional)
    - `date_filter`: Filter by event date (optional)
    - `start_date`: Start date for filtering events (optional). Used with `date_filter.custom`
    - `end_date`: End date for filtering events (optional). Used with `date_filter.custom`
    - `keyword`: Search keyword for event name or description (optional)

    **Returns:**
    - List of events matching the criteria with pagination info

    **Notes:**
    - Results are ordered by event datetime by default
    - Each event includes its associated media in carousel format
    - When club_id is provided, returns only events for that specific club
    - Returns 404 if specified club_id doesn't exist
    """
    try:
        # Verify club exists if club_id is provided
        if club_id:
            qb = QueryBuilder(session=db_session, model=Club)
            club: Club | None = await qb.base().filter(Club.id == club_id).first()

            if club is None:
                raise HTTPException(
                    status_code=404, detail=f"Event with club_id {club_id} not found"
                )

        # Build conditions list
        conditions = []

        if keyword:
            meili_result = await meilisearch.get(
                request=request,
                storage_name=EntityType.club_events.value,
                keyword=keyword,
                page=page,
                size=size,  # limit max returned IDs, adjust as needed
                filters=None,
            )
            event_ids = [item["id"] for item in meili_result["hits"]]

            if not event_ids:
                return ListEventSchema(products=[], num_of_pages=1)

        # SQLAlchemy conditions
        if club_type:
            conditions.append(Club.type == club_type)
        if event_policy:
            conditions.append(ClubEvent.policy == event_policy)
        if club_id:
            conditions.append(ClubEvent.club_id == club_id)
        if keyword:
            conditions.append(ClubEvent.id.in_(event_ids))

        if date_filter:
            try:
                # Pass the ORM column you want to filter on
                date_filter.apply(
                    conditions,
                    column=ClubEvent.event_datetime,
                    start_date=start_date,
                    end_date=end_date,
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        qb = QueryBuilder(session=db_session, model=ClubEvent)
        events: List[ClubEvent] = (
            await qb.base()
            .filter(*conditions)
            .join(Club if club_type else None)
            .eager(ClubEvent.club)
            .paginate(size if not keyword else None, page if not keyword else None)
            .order(ClubEvent.event_datetime.asc())
            .all()
        )

        # Build responses with media
        event_responses: List[ClubEventResponseSchema] = await response_builder.build_responses(
            request=request,
            items=events,
            session=db_session,
            media_format=MediaFormat.carousel,
            entity_type=EntityType.club_events,
            response_builder=utils.build_event_response,
        )

        if keyword:
            count = meili_result.get("estimatedTotalHits", 0)
        else:
            qb = QueryBuilder(session=db_session, model=ClubEvent)
            count: int = (
                await qb.base(count=True)
                .filter(*conditions)
                .join(Club if club_type else None)
                .count()
            )

        num_of_pages: int = response_builder.calculate_pages(count=count, size=size)
        return ListEventSchema(events=event_responses, num_of_pages=num_of_pages)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/events", response_model=ClubEventResponseSchema)
async def add_event(
    request: Request,
    event_data: ClubEventRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubEventResponseSchema:
    """
    Creates a new event. Requires admin privileges.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required)
    - The user must have admin privileges (checked via dependency)

    **Parameters:**
    - `event_data`: Event data including name, description, club_id, etc.

    **Returns:**
    - Created event with all its details and media

    **Notes:**
    - The event is indexed in Meilisearch after creation
    - Associated club must exist, otherwise returns 400
    """
    try:
        # Create event using common CRUD
        qb = QueryBuilder(session=db_session, model=ClubEvent)
        event: ClubEvent = await qb.add(data=event_data, preload=[ClubEvent.club])

    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Database integrity error: probably non-existent club_id. "
                f"Details: {str(e.orig)}"
            ),
        )

    # Index in Meilisearch
    await meilisearch.upsert(
        request=request,
        storage_name=ClubEvent.__tablename__,
        json_values={
            "id": event.id,
            "name": event.name,
            "description": event.description,
            "club_id": event.club_id,
            "policy": event.policy.value if event.policy else None,
        },
    )

    # Get associated media
    conditions = [
        Media.entity_id == event.id,
        Media.entity_type == EntityType.club_events,
        Media.media_format == MediaFormat.carousel,
    ]

    qb = QueryBuilder(session=db_session, model=Media)
    media_objects: List[Media] = await qb.base().filter(*conditions).all()

    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )

    return utils.build_event_response(event=event, media_responses=media_responses)


@router.patch("/events", response_model=ClubEventResponseSchema)
async def update_event(
    request: Request,
    event_id: int,
    new_data: ClubEventUpdateSchema,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubEventResponseSchema:
    """
    Updates fields of an existing event. Requires admin privileges.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required)
    - The user must have admin privileges (checked via dependency)

    **Parameters:**
    - `event_id`: ID of the event to update
    - `new_data`: Updated event data including name, description, policy, etc.

    **Returns:**
    - Updated event with all its details and media

    **Errors:**
    - Returns 404 if event is not found
    - Returns 500 on internal error
    """
    try:
        # Get event with admin check
        conditions = []  # No additional conditions since admin check is done via dependency
        qb = QueryBuilder(session=db_session, model=ClubEvent)
        event: ClubEvent | None = (
            await qb.base()
            .filter(ClubEvent.id == event_id, *conditions)
            .eager(ClubEvent.club)
            .first()
        )

        if event is None:
            raise HTTPException(status_code=404, detail="Event not found")

        # Update event in database
        qb = QueryBuilder(session=db_session, model=ClubEvent)
        updated_event: ClubEvent = await qb.update(instance=event, update_data=new_data)

        # Update Meilisearch index
        await meilisearch.upsert(
            request=request,
            storage_name=ClubEvent.__tablename__,
            json_values={
                "id": updated_event.id,
                "name": updated_event.name,
                "description": updated_event.description,
                "club_id": updated_event.club_id,
                "policy": updated_event.policy.value if updated_event.policy else None,
            },
        )

        # Get associated media
        conditions = [
            Media.entity_id == updated_event.id,
            Media.entity_type == EntityType.club_events,
            Media.media_format == MediaFormat.carousel,
        ]

        qb = QueryBuilder(session=db_session, model=Media)
        media_objects: List[Media] = await qb.base().filter(*conditions).all()

        media_responses: List[MediaResponse] = await response_builder.build_media_responses(
            request=request, media_objects=media_objects
        )

        return utils.build_event_response(event=updated_event, media_responses=media_responses)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/events", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    request: Request,
    event_id: int,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Deletes a specific event. Requires admin privileges.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required)
    - The user must have admin privileges (checked via dependency)

    **Parameters:**
    - `event_id`: The ID of the event to delete

    **Process:**
    - Deletes the event entry from the database
    - Deletes all related media files from the storage bucket and their DB records
    - Removes the event from the Meilisearch index

    **Returns:**
    - HTTP 204 No Content on successful deletion

    **Errors:**
    - Returns 404 if the event is not found
    - Returns 500 on internal error
    """
    try:
        # Get event with admin check
        qb = QueryBuilder(session=db_session, model=ClubEvent)
        event: ClubEvent | None = (
            await qb.base().filter(ClubEvent.id == event_id).eager(ClubEvent.club).first()
        )

        if event is None:
            raise HTTPException(status_code=404, detail="Event not found")

        # Get and delete associated media files
        media_conditions = [
            Media.entity_id == event.id,
            Media.entity_type == EntityType.club_events,
        ]

        qb = QueryBuilder(session=db_session, model=Media)
        media_objects: List[Media] = await qb.base().filter(*media_conditions).all()

        # Delete media files from storage bucket
        if media_objects:
            for media in media_objects:
                await delete_bucket_object(request, media.name)

        # Delete event from database
        qb = QueryBuilder(session=db_session, model=ClubEvent)
        event_deleted: bool = await qb.delete(target=event)

        # Delete associated media records from database
        qb = QueryBuilder(session=db_session, model=Media)
        media_deleted: bool = await qb.delete(target=media_objects)

        if not event_deleted or not media_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        # Remove from search index
        await meilisearch.delete(
            request=request, storage_name=ClubEvent.__tablename__, primary_key=str(event_id)
        )

        return status.HTTP_204_NO_CONTENT

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/events/{event_id}", response_model=ClubEventResponseSchema)
async def get_event(
    event_id: int,
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubEventResponseSchema:
    """
    Retrieves a single event by its unique ID, including
    its associated media files.

    **Parameters:**
    - `event_id`: The unique identifier of the event to retrieve
    - `access_token`: Required authentication token from cookies (via dependency)

    **Returns:**
    - A detailed event object if found, including its name, description,
    club details, policy, and media URLs

    **Errors:**
    - Returns `404 Not Found` if the event with the specified ID does not exist
    - Returns `401 Unauthorized` if no valid access token is provided
    """
    try:
        # Get event with its club relationship
        qb = QueryBuilder(session=db_session, model=ClubEvent)
        event: ClubEvent = (
            await qb.base().filter(ClubEvent.id == event_id).eager(ClubEvent.club).first()
        )

        if event is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        # Get associated media
        conditions = [
            Media.entity_id == event.id,
            Media.entity_type == EntityType.club_events,
            Media.media_format == MediaFormat.carousel,
        ]

        qb = QueryBuilder(session=db_session, model=Media)
        media_objects: List[Media] = await qb.base().filter(*conditions).all()

        media_responses: List[MediaResponse] = await response_builder.build_media_responses(
            request=request, media_objects=media_objects
        )

        return utils.build_event_response(event=event, media_responses=media_responses)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
