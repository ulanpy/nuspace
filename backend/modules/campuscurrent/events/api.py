from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import Response

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


@router.put("/events/{event_id}/going", response_model=schemas.EventGoingResponse)
async def set_event_going(
    event_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    event_service: EventService = Depends(get_event_service),
) -> schemas.EventGoingResponse:
    """
    Mark the current user as going to an event (idempotent).

    **Access Policy:**
    - Authenticated users who can read the event
    - Only for approved or cancelled events
    """
    return await event_service.set_going(event_id=event_id, user=user)


@router.delete("/events/{event_id}/going", response_model=schemas.EventGoingResponse)
async def unset_event_going(
    event_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    event_service: EventService = Depends(get_event_service),
) -> schemas.EventGoingResponse:
    """
    Remove the current user's going status (idempotent).

    **Access Policy:**
    - Authenticated users who can read the event
    - Only for approved or cancelled events
    """
    return await event_service.unset_going(event_id=event_id, user=user)


@router.get(
    "/events/{event_id}/attendees",
    response_model=schemas.ListEventAttendeesResponse,
)
async def get_event_attendees(
    event_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    event_service: EventService = Depends(get_event_service),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
) -> schemas.ListEventAttendeesResponse:
    """
    List users who marked themselves as going (paginated).

    **Access Policy:**
    - Event creator or admin only
    """
    return await event_service.list_attendees(event_id=event_id, user=user, page=page, size=size)


@router.get("/events/{event_id}/attendees/export")
async def export_event_attendees(
    event_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    event_service: EventService = Depends(get_event_service),
    format: schemas.EventAttendeesExportFormat = Query(
        default=schemas.EventAttendeesExportFormat.xlsx
    ),
) -> Response:
    """
    Download full attendance list as CSV or XLSX (print-ready checklist).

    **Access Policy:**
    - Event creator or admin only
    """
    content, filename, media_type = await event_service.export_attendees(
        event_id=event_id, user=user, export_format=format
    )
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.post(
    "/events/{event_id}/access-invites",
    response_model=schemas.EventAccessInviteCreatedResponse,
)
async def create_event_access_invite(
    event_id: int,
    body: schemas.EventAccessInviteCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    event_service: EventService = Depends(get_event_service),
) -> schemas.EventAccessInviteCreatedResponse:
    """
    Create a secret access link.

    Choose purpose before generation:
    - transfer: one-time ownership claim
    - co_view: share attendee-list visibility
    """
    return await event_service.create_access_invite(event_id=event_id, user=user, body=body)


@router.get(
    "/events/{event_id}/access-invites",
    response_model=schemas.ListEventAccessInvitesResponse,
)
async def list_event_access_invites(
    event_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    event_service: EventService = Depends(get_event_service),
) -> schemas.ListEventAccessInvitesResponse:
    return await event_service.list_access_invites(event_id=event_id, user=user)


@router.delete(
    "/events/{event_id}/access-invites/{invite_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_event_access_invite(
    event_id: int,
    invite_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    event_service: EventService = Depends(get_event_service),
):
    await event_service.revoke_access_invite(
        event_id=event_id, invite_id=invite_id, user=user
    )


@router.post(
    "/events/access-invites/accept",
    response_model=schemas.EventAccessInviteAcceptResponse,
)
async def accept_event_access_invite(
    body: schemas.EventAccessInviteAcceptRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    event_service: EventService = Depends(get_event_service),
) -> schemas.EventAccessInviteAcceptResponse:
    return await event_service.accept_access_invite(user=user, body=body)
