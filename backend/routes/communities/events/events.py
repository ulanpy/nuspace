from datetime import date
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
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
from backend.core.database.models.user import User
from backend.routes.communities.events import dependencies as deps
from backend.routes.communities.events import schemas, utils
from backend.routes.communities.events.policy import EventPolicy, ResourceAction
from backend.routes.google_bucket.utils import batch_delete_blobs

router = APIRouter(tags=["Events Routes"])


@router.get("/events", response_model=schemas.ListEventResponse)
async def get_events(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    registration_policy: RegistrationPolicy | None = None,
    event_scope: EventScope | None = None,
    event_type: EventType | None = None,
    event_status: EventStatus | None = None,
    community_id: int | None = None,
    start_date: date | None = Query(
        default=None, title="Start date", description="Дата начала диапазона (формат: YYYY-MM-DD)"
    ),
    end_date: date | None = Query(
        default=None, title="End date", description="Дата конца диапазона (формат: YYYY-MM-DD)"
    ),
    creator_sub: str | None = Query(
        default=None,
        description="If 'me', returns the current user's events (all statuses)",
    ),
    keyword: str | None = Query(
        default=None, description="Search keyword for event name or description"
    ),
) -> schemas.ListEventResponse:
    """
    Retrieves a paginated list of events with flexible filtering.

    **Access Policy:**
    - Admin can view all events without restrictions
    - Users can view their own events without restrictions
    - Community heads can view all events in their communities without restrictions
    - For other users viewing events they don't own:
      - Must explicitly specify status=approved
      - Cannot view events with other statuses

    **Examples:**
    - GET /events (own events) → All statuses allowed
    - GET /events (others' events) → Must specify status=approved
    - GET /events?status=approved → Allowed
    - GET /events?status=pending → Not allowed (if don't own event)

    **Parameters:**
    - `size`: Number of events per page (default: 20, max: 100)
    - `page`: Page number (default: 1)
    - `registration_policy`: Filter by event policy (optional)
    - `event_scope`: Filter by event scope (optional)
    - `event_type`: Filter by event type (optional)
    - `event_status`: Filter by event status (optional)
    - `community_id`: Filter by specific community (optional)
    - `start_date`: Start date for filtering events (optional)
    - `end_date`: End date for filtering events (optional)
    - `creator_sub`: Filter by event creator (optional)
        - If set to "me", returns the current user's events
        - If set to a specific user_sub, returns that user's approved events (if authorized)
    - `keyword`: Search keyword for event name or description (optional)

    **Returns:**
    - List of events matching the criteria with pagination info

    **Notes:**
    - When status is not specified, it means user wants to see all statuses
    - Regular users must explicitly request approved events when viewing others' events
    - No silent filtering is applied - user must be explicit about their intent
    - Results are ordered by event datetime by default
    - Returns 404 if specified community_id doesn't exist
    """
    # Create policy and check permissions
    await EventPolicy(user=user).check_permission(
        action=ResourceAction.READ,
        creator_sub=creator_sub,
        event_status=event_status,
        community_id=community_id,
        event_scope=event_scope,
    )

    # Build conditions list
    filters = []

    creator_sub = user[0].get("sub") if creator_sub == "me" else creator_sub

    if keyword:
        meili_result = await meilisearch.get(
            request=request,
            storage_name=EntityType.community_events.value,
            keyword=keyword,
            page=page,
            size=size,
            filters=None,
        )
        event_ids = [item["id"] for item in meili_result["hits"]]

        if not event_ids:
            return schemas.ListEventResponse(events=[], total_pages=1)

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
    if creator_sub:
        filters.append(Event.creator_sub == creator_sub)

    # Add date range filtering
    if start_date:
        filters.append(func.date(Event.event_datetime) >= start_date)
    if end_date:
        filters.append(func.date(Event.event_datetime) <= end_date)

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
            permissions=utils.get_event_permissions(event, user),
        )
        for event, media in zip(events, media_results)
    ]

    total_pages: int = response_builder.calculate_pages(count=count, size=size)
    return schemas.ListEventResponse(events=event_responses, total_pages=total_pages)


@router.post("/events", response_model=schemas.EventResponse)
async def add_event(
    request: Request,
    event_data: schemas.EventCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    event_user: User = Depends(deps.user_exists_or_404),
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

    **Data Enrichment:**
    The following fields are automatically set by the backend based on business rules:
    - `scope`: Set to personal if no community_id, community if community_id provided
    - `status`: Set based on user role and event type
      - Admin: approved
      - Community head: approved
      - Regular user: pending if community_id provided, approved if no community_id
    - `tag`: Set to regular always (changed to other tags with patch by admin)

    **Parameters:**
    - `event_data`: Event data including name, description, etc.

    **Returns:**
    - Created event with all its details, including enriched fields

    **Errors:**
    - Returns 403 if user doesn't have permission to create the event
    - Returns 404 if specified community does not exist

    **Note:**
    - `creator_sub` can be `me` to indicate the authenticated user
    - `community_id` is optional, if not provided the event is personal
    """
    # check permissions and enrich event data (Business logic)
    await EventPolicy(user=user).check_permission(
        action=ResourceAction.CREATE, event_data=event_data
    )
    event_data: schemas.EnrichedEventCreateRequest = await utils.EventEnrichmentService(
        user=user
    ).enrich_event_data(event_data)

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
        permissions=utils.get_event_permissions(event, user),
    )


@router.patch("/events/{event_id}", response_model=schemas.EventResponse)
async def update_event(
    request: Request,
    event_data: schemas.EventUpdateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    event: Event = Depends(deps.event_exists_or_404),
) -> schemas.EventResponse:
    """
    Updates fields of an existing event.

    **Access Policy:**
    - Admin can update any field
    - Community head of the event that belongs to the community:
      - Can update any field except: community_id, creator_sub, scope, tag
      - Can modify event status freely
    - Event creator of the personal event:
      - Can update any field except: community_id, creator_sub, scope, tag
    - Event creator of the community event:
      - Can update any field except: community_id, creator_sub, scope, tag, status

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
    await EventPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, event=event, event_data=event_data
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
        permissions=utils.get_event_permissions(event, user),
    )


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    request: Request,
    event_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    event: Event = Depends(deps.event_exists_or_404),
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
    await EventPolicy(user=user).check_permission(action=ResourceAction.DELETE, event=event)

    # Get and delete associated media files
    media_conditions = [
        Media.entity_id == event.id,
        Media.entity_type == EntityType.community_events,
    ]

    qb = QueryBuilder(session=db_session, model=Media)
    media_objects: List[Media] = await qb.base().filter(*media_conditions).all()

    # Delete media files from storage bucket
    await batch_delete_blobs(request, media_objects)

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
    event: Event = Depends(deps.event_exists_or_404),
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
    await EventPolicy(user=user).check_permission(action=ResourceAction.READ, event=event)

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
        permissions=utils.get_event_permissions(event, user),
    )
