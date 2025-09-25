from typing import Annotated, List

from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import (
    get_current_principals,
    get_db_session,
    get_optional_principals
)
from backend.common.utils.enums import ResourceAction
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.sgotinish import (
    Ticket,
    TicketCategory,
)
from backend.core.database.models.user import User
from backend.modules.sgotinish import dependencies as deps
from backend.modules.sgotinish import schemas
from backend.common.utils import meilisearch
from backend.modules.sgotinish.policy import SGotinishPolicy
from backend.modules.sgotinish.services import TicketService

router = APIRouter(tags=["SGotinish Tickets Routes"])


def get_ticket_service(db_session: AsyncSession = Depends(get_db_session)) -> TicketService:
    return TicketService(db_session)


# ============================================================================
# TICKET ENDPOINTS: currently 1 convsersaion for 1 ticket design
# ============================================================================


@router.get("/tickets", response_model=schemas.ListTicketDTO)
async def get_tickets(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    ticket_service: TicketService = Depends(get_ticket_service),
    size: int = Query(20, ge=1, le=100, description="Number of tickets to return per page for pagination"),
    page: int = Query(1, ge=1, description="Page number for ticket listing pagination"),
    category: TicketCategory | None = Query(default=None),
    author_sub: str | None = Query(
        default=None, description="If 'me', returns the current user's tickets"
    ),
    keyword: str | None = Query(default=None, description="Search keyword for ticket title or body"),
) -> schemas.ListTicketDTO:
    """
    Retrieves a paginated list of tickets with flexible filtering.

    **Access Policy:**
    - SG members and admins can view all tickets
    - Regular users can only view their own tickets

    **Parameters:**
    - `size`: Number of tickets per page (default: 20, max: 100)
    - `page`: Page number (default: 1)
    - `category`: Filter by ticket category (optional)
    - `author_sub`: Filter by ticket author (optional)
        - If set to "me", returns the current user's tickets
    - `keyword`: Search keyword for ticket title or body (optional)

    **Returns:**
    - List of tickets matching the criteria with pagination info
    """
    await SGotinishPolicy(user=user).check_permission(
        action=ResourceAction.READ,
        author_sub=author_sub,
    )

    if author_sub == "me":
        author_sub = user[0].get("sub")

    if keyword:
        meili_result: dict = await meilisearch.get(
            request=request,
            storage_name=EntityType.tickets.value,
            keyword=keyword,
            page=page,
            size=size,
            filters=None,
        )
        ticket_ids: List[int] = [item["id"] for item in meili_result["hits"]]

        if not ticket_ids:
            return schemas.ListTicketDTO(tickets=[], total_pages=1)

    response: schemas.ListTicketDTO = await ticket_service.get_tickets(
        user=user,
        size=size,
        page=page,
        ticket_ids=ticket_ids if keyword else None,
        category=category,
        author_sub=author_sub
        )

    return response


@router.post("/tickets", response_model=schemas.TicketResponseDTO)
async def create_ticket(
    request: Request,
    ticket_data: schemas.TicketCreateDTO,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    ticket_service: TicketService = Depends(get_ticket_service),
    ticket_user: User = Depends(deps.user_exists_or_404_for_ticket),
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
    - `author_sub` can be `me` to indicate the authenticated user
    - Tickets are created with `open` status by default
    """
    await SGotinishPolicy(user=user).check_permission(
        action=ResourceAction.CREATE, ticket_data=ticket_data
    )

    ticket, response_dto = await ticket_service.create_ticket(
        ticket_data=ticket_data, user=user
    )

    # Index in Meilisearch
    await meilisearch.upsert(
        request=request,
        storage_name=Ticket.__tablename__,
        json_values={
            "id": ticket.id,
            "title": ticket.title,
            "body": ticket.body,
            "category": ticket.category.value,
            "status": ticket.status.value,
        },
    )

    return response_dto


@router.get("/tickets/{ticket_id}", response_model=schemas.TicketResponseDTO)
async def get_ticket(
    user: Annotated[tuple[dict, dict], Depends(get_optional_principals)],
    ticket_service: TicketService = Depends(get_ticket_service),
    ticket: Ticket = Depends(deps.ticket_exists_or_404),
) -> schemas.TicketResponseDTO:
    """
    Retrieves a single ticket by its unique ID.

    **Access Policy:**
    - SG members and admins can view all tickets
    - Regular users can only view their own tickets

    **Parameters:**
    - `ticket_id`: The unique identifier of the ticket to retrieve

    **Returns:**
    - A detailed ticket object with all its information
    """
    await SGotinishPolicy(user=user).check_permission(action=ResourceAction.READ, ticket=ticket)

    response_dto = await ticket_service.get_ticket_by_id(ticket_id=ticket.id, user=user)

    return response_dto

