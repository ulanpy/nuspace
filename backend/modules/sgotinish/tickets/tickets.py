from typing import Annotated

from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_creds_or_401
from backend.core.database.models.sgotinish import (
    Ticket,
    TicketAccess,
    TicketCategory,
)
from backend.core.database.models.user import User
from backend.modules.sgotinish.tickets import dependencies as deps
from backend.modules.sgotinish.tickets import schemas
from backend.modules.sgotinish.tickets.policy import TicketPolicy
from backend.modules.sgotinish.tickets.service import TicketService
from fastapi import APIRouter, Depends, Query
from backend.common.dependencies import get_db_session
from backend.common.dependencies import get_infra
from backend.common.schemas import Infra
router = APIRouter(tags=["SGotinish Tickets Routes"])


# ============================================================================
# TICKET ENDPOINTS: currently 1 convsersaion for 1 ticket design
# ============================================================================


@router.post("/tickets", response_model=schemas.TicketResponseDTO)
async def create_ticket(
    ticket_data: schemas.TicketCreateDTO,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    ticket_service: TicketService = Depends(deps.get_ticket_service),
    _: User = Depends(deps.user_exists_or_404_for_ticket_creation),
) -> schemas.TicketResponseDTO:
    """
    Creates a new ticket.

    **Access Policy:**
    - Any authenticated user can create tickets
    - Users can only create tickets for themselves

    **Parameters:**
    - `ticket_data`: Ticket data including category, title, body, etc.

    **Returns:**
    - Created ticket with all its details

    **Notes:**
    - `author_sub` can be set to "me" to use the current user's sub.
    """
    TicketPolicy(user).check_create(ticket_data)
    response_dto: schemas.TicketResponseDTO = await ticket_service.create_ticket(
        ticket_data=ticket_data, user=user
    )

    return response_dto


@router.get("/tickets", response_model=schemas.ListTicketDTO)
async def get_tickets(
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    ticket_service: TicketService = Depends(deps.get_ticket_service),
    size: int = Query(
        20, ge=1, le=100, description="Number of tickets to return per page for pagination"
    ),
    page: int = Query(1, ge=1, description="Page number for ticket listing pagination"),
    category: TicketCategory | None = Query(default=None),
) -> schemas.ListTicketDTO:
    """
    Retrieves a paginated list of tickets with flexible filtering.

    **Access Policy:**
    - SG members and admins can view tickets they have access to
    - Regular users can only view their own tickets

    **Parameters:**
    - `size`: Number of tickets per page (default: 20, max: 100)
    - `page`: Page number (default: 1)
    - `category`: Filter by ticket category (optional)

    **Returns:**
    - List of tickets matching the criteria with pagination info
    """
    TicketPolicy(user_tuple).check_read_list()
    response: schemas.ListTicketDTO = await ticket_service.get_tickets(
        user=user_tuple,
        size=size,
        page=page,
        category=category,
    )

    return response


@router.get("/tickets/{ticket_id}", response_model=schemas.TicketResponseDTO)
async def get_ticket(
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    ticket_service: TicketService = Depends(deps.get_ticket_service),
    ticket: Ticket = Depends(deps.get_ticket),
) -> schemas.TicketResponseDTO:
    """
    Retrieves a single ticket by its unique ID.

    **Access Policy:**
    - SG members and admins can view tickets they have access to
    - Regular users can only view their own tickets

    **Parameters:**
    - `ticket_id`: The unique identifier of the ticket to retrieve

    **Returns:**
    - A detailed ticket object with all its information
    """
    # Get ticket access manually since we now have a flat dependency structure
    access: TicketAccess | None = await ticket_service.get_user_ticket_access(ticket, user_tuple)

    policy = TicketPolicy(user_tuple)
    policy.check_read_one(ticket=ticket, access=access)

    response_dto = await ticket_service.get_ticket_by_id(ticket_id=ticket.id, user=user_tuple)

    return response_dto


@router.patch("/tickets/{ticket_id}", response_model=schemas.TicketResponseDTO)
async def update_ticket(
    ticket_data: schemas.TicketUpdateDTO,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    ticket_service: TicketService = Depends(deps.get_ticket_service),
    ticket: Ticket = Depends(deps.get_ticket),
) -> schemas.TicketResponseDTO:
    """
    Updates a ticket by its unique ID.
    """
    # Get ticket access manually since we now have a flat dependency structure
    access: TicketAccess | None = await ticket_service.get_user_ticket_access(ticket, user_tuple)

    TicketPolicy(user_tuple).check_update(ticket, access)

    response_dto = await ticket_service.update_ticket(
        ticket=ticket, ticket_data=ticket_data, user=user_tuple
    )

    return response_dto
