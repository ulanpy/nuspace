from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import (
    get_creds_or_401,
    get_creds_or_guest,
    get_db_session,
    get_infra,
)
from backend.common.schemas import Infra
from backend.core.database.models import Event, User
from backend.modules.campuscurrent.events import dependencies as deps
from backend.modules.campuscurrent.events import schemas
from backend.modules.campuscurrent.events.policy import EventPolicy
from backend.modules.campuscurrent.events.service import EventService

router = APIRouter(tags=["Events Routes"])


@router.get("/events", response_model=schemas.ListEventResponse)
async def get_events(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    db_session: AsyncSession = Depends(get_db_session),
    event_filter: schemas.EventFilter = Depends(),
    infra: Infra = Depends(get_infra),
) -> schemas.ListEventResponse:
    """
    Retrieves a paginated list of events with flexible filtering.

    **Access Policy:**
    - Anyone (including guests) can view: Approved, Cancelled
    - Event creator, community head, admin can view: Approved, Pending, Rejected, Cancelled
    - For users viewing events they don't own:
      - Must explicitly specify status in {approved, cancelled}
      - Cannot view events with other statuses

    **Examples:**
    - GET /events (own events) → All statuses allowed
    - GET /events (others' events) → Must specify status=approved or status=cancelled
    - GET /events?status=approved → Allowed
    - GET /events?status=cancelled → Allowed
    - GET /events?status=pending → Not allowed (if don't own event)

    **Parameters:**
    - `size`: Number of events per page (default: 20, max: 100)
    - `page`: Page number (default: 1)
    - `registration_policy`: Filter by event policy (optional)
    - `event_scope`: Filter by event scope (optional)
    - `event_type`: Filter by event type (optional)
    - `event_status`: Filter by event status (optional)
    - `community_id`: Filter by specific community (optional)
    - `time_filter`: Predefined time filter (upcoming, today, week, month) - takes precedence over
       start_date/end_date
    - `start_date`: Start date for filtering events (optional, ignored if time_filter is provided)
    - `end_date`: End date for filtering events (optional, ignored if time_filter is provided)
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
    - Results are ordered by start_datetime by default
    - Returns 404 if specified community_id doesn't exist
    """
    # Create policy and check permissions
    EventPolicy(user=user).check_read_list(
        creator_sub=event_filter.creator_sub,
        event_status=event_filter.event_status,
        community_id=event_filter.community_id,
        event_scope=event_filter.event_scope,
    )

    event_service = EventService(db_session=db_session)
    events: schemas.ListEventResponse = await event_service.get_events(
        user=user,
        event_filter=event_filter,
        infra=infra,
    )
    return events


@router.post("/events", response_model=schemas.EventResponse)
async def add_event(
    event_data: schemas.EventCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
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
    EventPolicy(user=user).check_create(event_data=event_data)

    event_service = EventService(db_session=db_session)
    return await event_service.add_event(infra=infra, event_data=event_data, user=user)


@router.patch("/events/{event_id}", response_model=schemas.EventResponse)
async def update_event(
    event_data: schemas.EventUpdateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
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
    EventPolicy(user=user).check_update(event=event, event_data=event_data)

    event_service = EventService(db_session=db_session)
    event_response: schemas.EventResponse = await event_service.update_event(
        infra=infra, event=event, event_data=event_data, user=user
    )
    return event_response


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
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
    EventPolicy(user=user).check_delete(event=event)

    event_service = EventService(db_session=db_session)

    deleted: bool = await event_service.delete_event(infra=infra, event=event, event_id=event_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    return status.HTTP_204_NO_CONTENT


@router.get("/events/{event_id}", response_model=schemas.EventResponse)
async def get_event(
    event_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
    event: Event = Depends(deps.event_exists_or_404),
) -> schemas.EventResponse:
    """
    Retrieves a single event by its unique ID.

    **Access Policy:**
    - Anyone can view approved or cancelled events
    - Only event creator, community head, or admin can view pending or rejected events

    **Parameters:**
    - `event_id`: The unique identifier of the event to retrieve

    **Returns:**
    - A detailed event object if found, including its name, description,
    community details, policy, and media URLs

    **Errors:**
    - Returns 404 if event is not found
    - Returns 500 on internal error
    """
    # Check permissions for single event read
    EventPolicy(user=user).check_read_one(event=event)

    event_service = EventService(db_session=db_session)
    event_response: schemas.EventResponse | None = await event_service.get_event_by_id(
        infra=infra, event_id=event_id, user=user
    )
    if event_response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    return event_response
