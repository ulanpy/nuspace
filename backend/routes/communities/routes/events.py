from datetime import date
from typing import Annotated, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import check_role, check_token, get_db_session
from backend.common.schemas import MediaResponse
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.community import (
    Community,
    CommunityCategory,
    CommunityEvent,
    RegistrationPolicy,
)
from backend.core.database.models.media import Media, MediaFormat
from backend.core.database.models.user import UserRole
from backend.routes.communities.dependencies import (
    can_edit_event,
    get_date_conditions,
    mutate_event_status,
)
from backend.routes.communities.schemas.events import (
    CommunityEventRequestSchema,
    CommunityEventResponseSchema,
    CommunityEventUpdateSchema,
    ListCommunityEventSchema,
)
from backend.routes.communities.utils import events as utils
from backend.routes.google_bucket.utils import delete_bucket_object

router = APIRouter(tags=["Events Routes"])


@router.get("/events", response_model=ListCommunityEventSchema)
async def get_events(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    community_type: Optional[CommunityCategory] = None,
    event_policy: Optional[RegistrationPolicy] = None,
    community_id: Optional[int] = None,
    start_date: date | None = Query(
        None,
        title="Start date",
        description="Start date for event filtering (format: YYYY-MM-DD)",
        example="2025-05-19",
    ),
    end_date: date | None = Query(
        None,
        title="End date",
        description="End date for event filtering (format: YYYY-MM-DD)",
        example="2025-05-25",
    ),
    keyword: str | None = None,
    date_conditions: Annotated[List[Any], Depends(get_date_conditions)] = None,
    db_session: AsyncSession = Depends(get_db_session),
) -> ListCommunityEventSchema:
    """
    Retrieves a paginated list of events with flexible filtering.

    **Parameters:**
    - `size`: Number of events per page (default: 20)
    - `page`: Page number (default: 1)
    - `community_type`: Filter by community type (optional)
    - `event_policy`: Filter by event policy (optional)
    - `community_id`: Filter by specific community (optional)
    - `start_date`: Start date for filtering events (optional)
    - `end_date`: End date for filtering events (optional)
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
        # Verify community exists if community_id is provided
        if community_id:
            qb = QueryBuilder(session=db_session, model=Community)
            community: Community | None = (
                await qb.base().filter(Community.id == community_id).first()
            )

            if community is None:
                raise HTTPException(
                    status_code=404, detail=f"Event with community_id {community_id} not found"
                )

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
                return ListCommunityEventSchema(events=[], num_of_pages=1)

        # SQLAlchemy conditions
        if community_type:
            conditions.append(Community.type == community_type)
        if event_policy:
            conditions.append(CommunityEvent.policy == event_policy)
        if community_id:
            conditions.append(CommunityEvent.community_id == community_id)
        if keyword:
            conditions.append(CommunityEvent.id.in_(event_ids))

        # Add date conditions from dependency
        conditions.extend(date_conditions or [])

        qb = QueryBuilder(session=db_session, model=CommunityEvent)
        events: List[CommunityEvent] = (
            await qb.base()
            .filter(*conditions)
            .join(Community if community_type else None)
            .eager(CommunityEvent.creator)
            .paginate(size if not keyword else None, page if not keyword else None)
            .order(CommunityEvent.event_datetime.asc())
            .all()
        )

        # Build responses with media
        event_responses: List[CommunityEventResponseSchema] = (
            await response_builder.build_responses(
                request=request,
                items=events,
                session=db_session,
                media_format=MediaFormat.carousel,
                entity_type=EntityType.community_events,
                response_builder=utils.build_event_response,
            )
        )

        if keyword:
            count = meili_result.get("estimatedTotalHits", 0)
        else:
            qb = QueryBuilder(session=db_session, model=CommunityEvent)
            count: int = (
                await qb.base(count=True)
                .filter(*conditions)
                .join(Community if community_type else None)
                .count()
            )

        num_of_pages: int = response_builder.calculate_pages(count=count, size=size)
        return ListCommunityEventSchema(events=event_responses, num_of_pages=num_of_pages)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/events", response_model=CommunityEventResponseSchema)
async def add_event(
    request: Request,
    event_data: Annotated[CommunityEventRequestSchema, Depends(mutate_event_status)],
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityEventResponseSchema:
    """
    Creates a new event.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required)

    **Parameters:**
    - `event_data`: Event data including name, description, community_id, etc.

    **Returns:**
    - Created event with all its details and media

    **Notes:**
    - For admin users: no status/tag mutations
    - For non-admin users:
      - If no community_id: creates a personal event
      - If community_id provided:
        - If user is head -> status = approved
        - If not head -> status = pending
      - Tag is always set to regular
    """
    try:
        # Create event using common CRUD
        qb = QueryBuilder(session=db_session, model=CommunityEvent)
        event: CommunityEvent = await qb.add(data=event_data, preload=[CommunityEvent.creator])

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
        storage_name=CommunityEvent.__tablename__,
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
    media_objects: List[Media] = await qb.base().filter(*conditions).all()

    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )

    return utils.build_event_response(event=event, media_responses=media_responses)


@router.patch("/events/{event_id}", response_model=CommunityEventResponseSchema)
async def update_event(
    request: Request,
    new_data: CommunityEventUpdateSchema,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[bool, Depends(check_role)],
    event: Annotated[CommunityEvent, Depends(can_edit_event)],
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityEventResponseSchema:
    """
    Updates fields of an existing event. You must be the creator, admin, or head of the community.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required)
    - The user must be the creator, admin, or head of the community

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
        # Update event in database
        qb = QueryBuilder(session=db_session, model=CommunityEvent)
        updated_event: CommunityEvent = await qb.update(instance=event, update_data=new_data)

        # Update Meilisearch index
        await meilisearch.upsert(
            request=request,
            storage_name=CommunityEvent.__tablename__,
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
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[bool, Depends(check_role)],
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
    if role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No permissions")

    try:
        # Get event with admin check
        qb = QueryBuilder(session=db_session, model=CommunityEvent)
        event: CommunityEvent | None = (
            await qb.base()
            .filter(CommunityEvent.id == event_id)
            .eager(CommunityEvent.community)
            .first()
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
        qb = QueryBuilder(session=db_session, model=CommunityEvent)
        event_deleted: bool = await qb.delete(target=event)

        # Delete associated media records from database
        qb = QueryBuilder(session=db_session, model=Media)
        media_deleted: bool = await qb.delete(target=media_objects)

        if not event_deleted or not media_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        # Remove from search index
        await meilisearch.delete(
            request=request, storage_name=CommunityEvent.__tablename__, primary_key=str(event_id)
        )

        return status.HTTP_204_NO_CONTENT

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/events/{event_id}", response_model=CommunityEventResponseSchema)
async def get_event(
    event_id: int,
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityEventResponseSchema:
    """
    Retrieves a single event by its unique ID, including
    its associated media files.

    **Parameters:**
    - `event_id`: The unique identifier of the event to retrieve
    - `access_token`: Required authentication token from cookies (via dependency)

    **Returns:**
    - A detailed event object if found, including its name, description,
    community details, policy, and media URLs

    **Errors:**
    - Returns `404 Not Found` if the event with the specified ID does not exist
    - Returns `401 Unauthorized` if no valid access token is provided
    """
    try:
        # Get event with its community relationship
        qb = QueryBuilder(session=db_session, model=CommunityEvent)
        event: CommunityEvent = (
            await qb.base()
            .filter(CommunityEvent.id == event_id)
            .eager(CommunityEvent.community)
            .first()
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
