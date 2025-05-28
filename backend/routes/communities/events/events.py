from datetime import date
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from backend.common.schemas import MediaResponse
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models import (
    Event,
    EventScope,
    EventStatus,
    EventType,
    RegistrationPolicy,
)
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.routes.communities.events import policy, schemas, utils
from backend.routes.google_bucket.utils import delete_bucket_object

router = APIRouter(tags=["Events Routes"])


@router.get("/events", response_model=schemas.ListEvent)
async def get_events(
    request: Request,
    # user: Annotated[dict, Depends(policy.check_read_permission)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    registration_policy: RegistrationPolicy | None = None,
    event_scope: EventScope | None = None,
    event_type: EventType | None = None,
    event_status: EventStatus | None = EventStatus.approved,
    community_id: int | None = None,
    start_date: date | None = Query(
        None,
        title="Start date",
        description="Дата начала диапазона (формат: YYYY-MM-DD)",
        example="2025-05-19",
    ),
    end_date: date | None = Query(
        None,
        title="End date",
        description="Дата конца диапазона (формат: YYYY-MM-DD)",
        example="2025-05-25",
    ),
    keyword: str | None = None,
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.ListEvent:
    """
    Retrieves a paginated list of events with flexible filtering.

    **Access Policy:**
    - All users can see approved and cancelled events
    - Community heads and event creators can see pending and rejected events
    - Admins can see all events

    **Parameters:**
    - `size`: Number of events per page (default: 20, max: 100)
    - `page`: Page number (default: 1)
    - `registration_policy`: Filter by event policy (optional)
    - `event_scope`: Filter by event scope (optional)
    - `event_type`: Filter by event type (optional)
    - `event_status`: Filter by event status (optional)
    - `community_id`: Filter by specific community (optional)
    - `date_filter`: Filter by event date (optional)
    - `start_date`: Start date for filtering events (optional). Used with `date_filter.custom`
    - `end_date`: End date for filtering events (optional). Used with `date_filter.custom`
    - `keyword`: Search keyword for event name or description (optional)

    **Returns:**
    - List of events matching the criteria with pagination info

    **Notes:**
    - Results are ordered by event datetime by default
    - Each event includes its associated media in carousel format
    - When community_id is provided, returns only events for that specific community
    - Returns 404 if specified community_id doesn't exist
    """
    # Build conditions list
    filters = []

    if keyword:
        meili_result = await meilisearch.get(
            request=request,
            storage_name=EntityType.community_events.value,
            keyword=keyword,
            page=page,
            size=size,  # limit max returned IDs, adjust as needed
            filters=None,
        )
        event_ids = [item["id"] for item in meili_result["hits"]]

        if not event_ids:
            return schemas.ListEvent(events=[], total_pages=1)

    # SQLAlchemy conditions
    if registration_policy:
        filters.append(Event.policy == registration_policy)
    if community_id:
        filters.append(Event.community_id == community_id)
    if keyword:
        filters.append(Event.id.in_(event_ids))
    if event_type:
        filters.append(Event.type == event_type)
    if event_status:
        filters.append(Event.status == event_status)
    if event_scope:
        filters.append(Event.scope == event_scope)

    qb = QueryBuilder(session=db_session, model=Event)
    events: List[Event] = (
        await qb.base()
        .filter(*filters)
        .eager(Event.creator, Event.community, Event.collaborators)
        .paginate(size if not keyword else None, page if not keyword else None)
        .order(Event.event_datetime.asc())
        .all()
    )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id.in_([event.id for event in events]),
            Media.entity_type == EntityType.community_events,
            Media.media_format == MediaFormat.carousel,
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        request=request, media_objects=media_objs, resources=events
    )

    if keyword:
        count = meili_result.get("estimatedTotalHits", 0)
    else:
        count: int = await qb.blank(model=Event).base(count=True).filter(*filters).count()

    event_responses: List[schemas.EventResponse] = [
        response_builder.build_schema(
            schemas.EventResponse,
            schemas.EventResponse.model_validate(event),
            media=media,
            collaborators=event.collaborators,
            community=event.community,
            creator=event.creator,
        )
        for event, media in zip(events, media_results)
    ]

    total_pages: int = response_builder.calculate_pages(count=count, size=size)
    return schemas.ListEvent(events=event_responses, total_pages=total_pages)


@router.post("/events", response_model=schemas.EventResponse)
async def add_event(
    request: Request,
    event_data: schemas.EventRequest,
    # user: Annotated[dict, Depends(policy.check_create_permission)],
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.EventResponse:
    """
    Creates a new event.

    **Access Policy:**
    - Scope: personal - Any authenticated user can create personal events
    - Scope: community - Set to Status.approved if user is community head
    - Scope: community - Set to Status.pending if user is not community head
    - Admins can create events with any status, tag and type

    **Parameters:**
    - `event_data`: Event data including name, description, etc.

    **Returns:**
    - Created event with all its details and media

    **Errors:**
    - Returns 400 if event status is invalid for user's role
    - Returns 403 if non-admin tries to set non-regular tag
    """

    qb = QueryBuilder(session=db_session, model=Event)
    event: Event = await qb.add(
        data=event_data,
        preload=[Event.creator, Event.community],
    )

    # Index in Meilisearch
    await meilisearch.upsert(
        request=request,
        storage_name=Event.__tablename__,
        json_values={
            "id": event.id,
            "name": event.name,
            "description": event.description,
            "policy": event.policy.value if event.policy else None,
        },
    )

    # Get associated media
    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id == event.id,
            Media.entity_type == EntityType.community_events,
            Media.media_format == MediaFormat.carousel,
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        request=request, media_objects=media_objs, resources=[event]
    )

    return response_builder.build_schema(
        schemas.EventResponse,
        schemas.EventResponse.model_validate(event),
        creator=schemas.ShortUserResponse.model_validate(event.creator),
        media=media_results[0],
        community=(
            schemas.ShortCommunityResponse.model_validate(event.community)
            if event.community
            else None
        ),
    )


@router.patch("/events/{event_id}", response_model=schemas.EventResponse)
async def update_event(
    request: Request,
    event_id: int,
    new_data: schemas.EventUpdate,
    # user: Annotated[dict, Depends(policy.check_update_permission)],
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.EventResponse:
    """
    Updates fields of an existing event.

    **Access Policy:**
    - Event creator can update their own event
    - Community head can update events in their community
    - Admin can update any event
    - Event status must match user's role:
      - Admin: any status
      - Community head: approved status
      - Regular user: pending status for community events, personal for personal events

    **Parameters:**
    - `event_id`: ID of the event to update
    - `new_data`: Updated event data including name, description, policy, etc.

    **Returns:**
    - Updated event with all its details and media

    **Errors:**
    - Returns 404 if event is not found
    - Returns 403 if user doesn't have permission
    - Returns 400 if event status is invalid for user's role
    - Returns 500 on internal error
    """
    # Get event
    qb = QueryBuilder(session=db_session, model=Event)
    event: Event | None = (
        await qb.base().filter(Event.id == event_id).eager(Event.community, Event.creator).first()
    )

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Update event in database
    qb = QueryBuilder(session=db_session, model=Event)
    event: Event = await qb.update(
        instance=event,
        update_data=new_data,
        preload=[Event.creator],
    )

    # Update Meilisearch index
    await meilisearch.upsert(
        request=request,
        storage_name=Event.__tablename__,
        json_values={
            "id": event.id,
            "name": event.name,
            "description": event.description,
            "community_id": event.community_id,
            "policy": event.policy.value if event.policy else None,
        },
    )

    # Get associated media
    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id == event.id,
            Media.entity_type == EntityType.community_events,
            Media.media_format == MediaFormat.carousel,
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        request=request, media_objects=media_objs, resources=[event]
    )

    return response_builder.build_schema(
        schemas.EventResponse,
        schemas.EventResponse.model_validate(event),
        creator=schemas.ShortUserResponse.model_validate(event.creator),
        media=media_results[0],
        community=(
            schemas.ShortCommunityResponse.model_validate(event.community)
            if event.community
            else None
        ),
    )


@router.delete("/events", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    request: Request,
    event_id: int,
    user: Annotated[dict, Depends(policy.check_delete_permission)],
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Deletes a specific event.

    **Access Policy:**
    - Event creator can delete their own event
    - Community head can delete events in their community
    - Admin can delete any event

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
    - Returns 403 if user doesn't have permission
    - Returns 500 on internal error
    """
    try:
        # Get event
        qb = QueryBuilder(session=db_session, model=Event)
        event: Event | None = (
            await qb.base().filter(Event.id == event_id).eager(Event.community).first()
        )

        if event is None:
            raise HTTPException(status_code=404, detail="Event not found")

        # Get and delete associated media files
        media_conditions = [
            Media.entity_id == event.id,
            Media.entity_type == EntityType.community_events,
        ]

        qb = QueryBuilder(session=db_session, model=Media)
        media_objects: List[Media] = await qb.base().filter(*media_conditions).all()

        # Delete media files from storage bucket
        if media_objects:
            for media in media_objects:
                await delete_bucket_object(request, media.name)

        # Delete event from database
        qb = QueryBuilder(session=db_session, model=Event)
        event_deleted: bool = await qb.delete(target=event)

        # Delete associated media records from database
        qb = QueryBuilder(session=db_session, model=Media)
        media_deleted: bool = await qb.delete(target=media_objects)

        if not event_deleted or not media_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        # Remove from search index
        await meilisearch.delete(
            request=request, storage_name=Event.__tablename__, primary_key=str(event_id)
        )

        return status.HTTP_204_NO_CONTENT

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/events/{event_id}", response_model=schemas.EventResponse)
async def get_event(
    event_id: int,
    request: Request,
    user: Annotated[dict, Depends(policy.check_read_permission)],
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.EventResponse:
    """
    Retrieves a single event by its unique ID.

    **Access Policy:**
    - All authenticated users can access this endpoint

    **Parameters:**
    - `event_id`: The unique identifier of the event to retrieve

    **Returns:**
    - A detailed event object if found, including its name, description,
    community details, policy, and media URLs

    **Errors:**
    - Returns 404 if event is not found
    - Returns 500 on internal error
    """
    try:
        # Get event with its community relationship
        qb = QueryBuilder(session=db_session, model=Event)
        event: Event | None = (
            await qb.base().filter(Event.id == event_id).eager(Event.community).first()
        )

        if event is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        # Get associated media
        conditions = [
            Media.entity_id == event.id,
            Media.entity_type == EntityType.community_events,
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
