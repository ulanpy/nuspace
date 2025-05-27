from datetime import date
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
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


@router.get("/events", response_model=schemas.ListEventSchema)
async def get_events(
    request: Request,
    user: Annotated[dict, Depends(policy.check_read_permission)],
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
) -> schemas.ListEventSchema:
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
    try:
        # Build conditions list
        conditions = []

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
                return schemas.ListEventSchema(events=[], num_of_pages=1)

        # SQLAlchemy conditions
        if registration_policy:
            conditions.append(Event.policy == registration_policy)
        if community_id:
            conditions.append(Event.community_id == community_id)
        if keyword:
            conditions.append(Event.id.in_(event_ids))
        if event_type:
            conditions.append(Event.type == event_type)
        if event_status:
            conditions.append(Event.status == event_status)
        if event_scope:
            conditions.append(Event.scope == event_scope)

        qb = QueryBuilder(session=db_session, model=Event)
        events: List[Event] = (
            await qb.base()
            .filter(*conditions)
            .eager(Event.creator, Event.community)
            .paginate(size if not keyword else None, page if not keyword else None)
            .order(Event.event_datetime.asc())
            .all()
        )

        # Build responses with media
        event_responses: List[schemas.EventResponseSchema] = await response_builder.build_responses(
            request=request,
            items=events,
            session=db_session,
            media_format=MediaFormat.carousel,
            entity_type=EntityType.community_events,
            response_builder=utils.build_event_response,
        )

        if keyword:
            count = meili_result.get("estimatedTotalHits", 0)
        else:
            qb = QueryBuilder(session=db_session, model=Event)
            count: int = await qb.base(count=True).filter(*conditions).count()

        num_of_pages: int = response_builder.calculate_pages(count=count, size=size)
        return schemas.ListEventSchema(events=event_responses, num_of_pages=num_of_pages)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/events/personal", response_model=schemas.EventResponseSchema)
async def add_personal_event(
    request: Request,
    event_data: schemas.PersonalEventRequestSchema,
    user: Annotated[dict, Depends(policy.check_create_permission)],
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.EventResponseSchema:
    """
    Creates a new personal event.

    **Access Policy:**
    - Any authenticated user can create personal events

    **Parameters:**
    - `event_data`: Event data including name, description, etc.

    **Returns:**
    - Created event with all its details and media

    **Errors:**
    - Returns 400 if community_id is provided
    - Returns 400 if status is not personal
    - Returns 403 if non-admin tries to set non-regular tag
    """

    try:
        # Create event using common CRUD
        qb = QueryBuilder(session=db_session, model=Event)
        event: Event = await qb.add(
            data=event_data,
            preload=[Event.creator, Event.community],
        )

    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e.orig)}",
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
    conditions = [
        Media.entity_id == event.id,
        Media.entity_type == EntityType.community_events,
        Media.media_format == MediaFormat.carousel,
    ]

    qb = QueryBuilder(session=db_session, model=Media)
    media_objects: List[Media] = await qb.base().filter(*conditions).all()

    event_media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )

    return utils.build_event_response(event=event, event_media_responses=event_media_responses)


@router.post("/events/community", response_model=schemas.EventResponseSchema)
async def add_community_event(
    request: Request,
    event_data: schemas.CommunityEventRequestSchema,
    user: Annotated[dict, Depends(policy.check_create_permission)],
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.EventResponseSchema:
    """
    Creates a new community event.

    **Access Policy:**
    - Any authenticated user can create community events
    - If user is community head -> status must be approved
    - If not community head -> status must be pending
    - Event tag must be regular (admin can set other tags)

    **Parameters:**
    - `event_data`: Event data including name, description, community_id, etc.
      Note: community_id is required

    **Returns:**
    - Created event with all its details and media, including community media

    **Errors:**
    - Returns 400 if community_id is not provided
    - Returns 400 if community doesn't exist
    - Returns 400 if status doesn't match user's role (approved for head, pending for others)
    - Returns 403 if non-admin tries to set non-regular tag
    """
    # Ensure community_id is provided
    if event_data.community_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Community events must have community_id",
        )

    try:
        # Create event using common CRUD
        qb = QueryBuilder(session=db_session, model=Event)
        event: Event = await qb.add(
            data=event_data,
            preload=[Event.creator, Event.community],
        )

    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Database integrity error: probably non-existent community_id. "
                f"Details: {str(e.orig)}"
            ),
        )

    # Index in Meilisearch
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
    conditions = [
        Media.entity_id == event.id,
        Media.entity_type == EntityType.community_events,
        Media.media_format == MediaFormat.carousel,
    ]

    qb = QueryBuilder(session=db_session, model=Media)
    event_media_objects: List[Media] = await qb.base().filter(*conditions).all()

    event_media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=event_media_objects
    )

    # Get community media
    community_media_objects: List[Media] = (
        await qb.base()
        .filter(
            Media.entity_id == event.community_id,
            Media.entity_type == EntityType.community,
            Media.media_format == MediaFormat.profile,
        )
        .all()
    )

    community_media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=community_media_objects
    )

    return utils.build_event_response(
        event=event,
        event_media_responses=event_media_responses,
        community_media_responses=community_media_responses,
    )


@router.patch("/events", response_model=schemas.EventResponseSchema)
async def update_event(
    request: Request,
    event_id: int,
    new_data: schemas.CommunityEventUpdateSchema,
    user: Annotated[dict, Depends(policy.check_update_permission)],
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.EventResponseSchema:
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
    try:
        # Get event
        qb = QueryBuilder(session=db_session, model=Event)
        event: Event | None = (
            await qb.base()
            .filter(Event.id == event_id)
            .eager(Event.community, Event.creator)
            .first()
        )

        if event is None:
            raise HTTPException(status_code=404, detail="Event not found")

        # Update event in database
        qb = QueryBuilder(session=db_session, model=Event)
        updated_event: Event = await qb.update(
            instance=event,
            update_data=new_data,
            preload=[Event.creator],
        )

        # Update Meilisearch index
        await meilisearch.upsert(
            request=request,
            storage_name=Event.__tablename__,
            json_values={
                "id": updated_event.id,
                "name": updated_event.name,
                "description": updated_event.description,
                "community_id": updated_event.community_id,
                "policy": updated_event.policy.value if updated_event.policy else None,
            },
        )

        # Get associated media
        conditions = [
            Media.entity_id == updated_event.id,
            Media.entity_type == EntityType.community_events,
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


@router.get("/events/{event_id}", response_model=schemas.EventResponseSchema)
async def get_event(
    event_id: int,
    request: Request,
    user: Annotated[dict, Depends(policy.check_read_permission)],
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.EventResponseSchema:
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
