from datetime import date
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
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
from backend.routes.communities.events import schemas
from backend.routes.communities.events.dependencies import event_exists_or_404
from backend.routes.communities.events.policy import EventPolicy, ResourceAction
from backend.routes.google_bucket.utils import delete_bucket_object

router = APIRouter(tags=["Events Routes"])


@router.get("/events", response_model=schemas.ListEvent)
async def get_events(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
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
    # Create policy and check permissions
    policy = EventPolicy(db_session)
    await policy.check_permission(action=ResourceAction.READ, user=user)

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
    event_data: schemas.EventCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.EventResponse:
    """
    Creates a new event.

    **Access Policy:**
    - Admin can create events with any configuration
    - For personal events:
      - Cannot have a community_id (enforced by schema)
      - Any authenticated user can create
    - For community events:
      - Must have a community_id (enforced by schema)
      - If user is community head:
        - Can set any status
      - If user is not community head:
        - Status must be pending
    - Non-admin users can only use regular tag

    **Parameters:**
    - `event_data`: Event data including name, description, etc.

    **Returns:**
    - Created event with all its details and media

    **Errors:**
    - Returns 400 if event data violates schema rules (e.g., mixing personal scope
      with community_id)
    - Returns 400 if event status is invalid for user's role
    - Returns 403 if non-admin tries to set non-regular tag
    - Returns 404 if specified community does not exist
    """
    # Create policy and check permissions
    policy = EventPolicy(db_session)
    await policy.check_permission(action=ResourceAction.CREATE, user=user, event_data=event_data)

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
    event_data: schemas.EventUpdateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    event: Event = Depends(event_exists_or_404),
) -> schemas.EventResponse:
    """
    Updates fields of an existing event.

    **Access Policy:**
    - Admin can update any field
    - Community head:
      - Can update any field except: community_id, creator_sub, scope, tag
      - Can modify event status freely
    - Event creator:
      - Can update any field except: community_id, creator_sub, scope, tag, status
      - Cannot modify status
    - For personal events:
      - Only creator and admin can update
      - Non-admin users cannot update status
    - For community events:
      - Only creator, community head, and admin can update
      - Non-head users cannot update status

    **Parameters:**
    - `event_id`: ID of the event to update
    - `event_data`: Updated event data including name, description, policy, etc.

    **Returns:**
    - Updated event with all its details and media

    **Errors:**
    - Returns 404 if event is not found
    - Returns 403 if user doesn't have permission to update the event
    - Returns 403 if user tries to update restricted fields
    - Returns 400 if user tries to update status without proper permissions
    - Returns 500 on internal error
    """
    # Create policy
    policy = EventPolicy(db_session)
    await policy.check_permission(
        action=ResourceAction.UPDATE, user=user, event=event, event_data=event_data
    )

    # Update event in database
    qb = QueryBuilder(session=db_session, model=Event)
    event: Event = await qb.update(
        instance=event,
        update_data=event_data,
        preload=[Event.creator, Event.community],
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


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    request: Request,
    event_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    event: Event = Depends(event_exists_or_404),
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
    policy = EventPolicy(db_session)
    await policy.check_permission(action=ResourceAction.DELETE, user=user, event=event)

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
    event_deleted: bool = await qb.blank(Event).delete(target=event)

    # Delete associated media records from database
    media_deleted: bool = await qb.blank(Media).delete(target=media_objects)

    if not event_deleted or not media_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # Remove from search index
    await meilisearch.delete(
        request=request, storage_name=Event.__tablename__, primary_key=str(event_id)
    )

    return status.HTTP_204_NO_CONTENT


@router.get("/events/{event_id}", response_model=schemas.EventResponse)
async def get_event(
    event_id: int,
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
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
    # Create policy and check permissions
    policy = EventPolicy(db_session)
    await policy.check_permission(ResourceAction.READ, user)

    # Get event with its community relationship
    qb = QueryBuilder(session=db_session, model=Event)
    event: Event | None = (
        await qb.base().filter(Event.id == event_id).eager(Event.community, Event.creator).first()
    )

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

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
