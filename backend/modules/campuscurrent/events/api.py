from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.common.dependencies import get_infra
from backend.common.schemas import Infra
from backend.modules.auth.dependencies import (
    get_creds_or_401,
    get_creds_or_guest,
)
from backend.modules.campuscurrent.events import schemas
from backend.modules.campuscurrent.events.dependencies import get_event_service
from backend.modules.campuscurrent.events.service import EventService

router = APIRouter(tags=["Events Routes"])


@router.get("/events", response_model=schemas.ListEventResponse)
async def get_events(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    event_filter: schemas.EventFilter = Depends(),
    infra: Infra = Depends(get_infra),
    event_service: EventService = Depends(get_event_service),
) -> schemas.ListEventResponse:
    """
    Retrieves a paginated list of events with flexible filtering.

    **Access Policy:**
    - Anyone (including guests) can view: Approved, Cancelled
    - Event creator or admin can view all statuses for their own events
    - For users viewing events they don't own:
      - Must explicitly specify status in {approved, cancelled}
    """
    return await event_service.get_events(
        user=user,
        event_filter=event_filter,
        infra=infra,
    )


@router.post("/events", response_model=schemas.EventResponse)
async def add_event(
    event_data: schemas.EventCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    event_service: EventService = Depends(get_event_service),
) -> schemas.EventResponse:
    """
    Creates a new event.

    **Access Policy:**
    - Any authenticated user can create events for themselves
    - Admin can create events with any configuration

    **Data Enrichment:**
    - `status`: approved
    - `tag`: regular (admins can change later)
    """
    return await event_service.add_event(infra=infra, event_data=event_data, user=user)


@router.patch("/events/{event_id}", response_model=schemas.EventResponse)
async def update_event(
    event_id: int,
    event_data: schemas.EventUpdateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    event_service: EventService = Depends(get_event_service),
) -> schemas.EventResponse:
    """
    Updates fields of an existing event.

    **Access Policy:**
    - Admin can update any field
    - Event creator can update most fields except tag
    """
    return await event_service.update_event(
        infra=infra, event_id=event_id, event_data=event_data, user=user
    )


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    event_service: EventService = Depends(get_event_service),
):
    """
    Deletes a specific event.

    **Access Policy:**
    - Event creator or admin
    """
    await event_service.delete_event(infra=infra, event_id=event_id, user=user)


@router.get("/events/{event_id}", response_model=schemas.EventResponse)
async def get_event(
    event_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    infra: Infra = Depends(get_infra),
    event_service: EventService = Depends(get_event_service),
) -> schemas.EventResponse:
    """
    Retrieves a specific event by ID.
    """
    return await event_service.get_event_by_id(infra=infra, event_id=event_id, user=user)
