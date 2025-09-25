from typing import Annotated

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_creds_or_401
from backend.core.database.models.sgotinish import Ticket, TicketAccess
from backend.core.database.models.user import User
from backend.modules.sgotinish.tickets import dependencies as deps
from backend.modules.sgotinish.tickets import schemas
from backend.modules.sgotinish.tickets.policy import TicketPolicy
from backend.modules.sgotinish.tickets.service import TicketService
from fastapi import APIRouter, Depends, status

router = APIRouter(tags=["SGotinish Delegation Routes"])


@router.post("/tickets/{ticket_id}/delegate", status_code=status.HTTP_204_NO_CONTENT)
async def delegate_ticket_access(
    ticket_id: int,
    payload: schemas.DelegateAccessPayload,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    ticket: Ticket = Depends(deps.get_ticket),
    target_user: User = Depends(deps.user_exists_or_404_for_delegation_creation),
    ticket_service: TicketService = Depends(deps.get_ticket_service),
):
    """
    Delegates access to a ticket to another user.

    **Access Policy:**
    - A user must have `DELEGATE` permission on the ticket to grant access.
    - **Boss**: Can delegate to any Capo or Soldier.
    - **Capo**: Can only delegate to Soldiers within their own department.
    - **Soldier**: Cannot delegate.
    """
    # Manually fetch the required data for the policy check
    user_access: TicketAccess | None = await (
        QueryBuilder(ticket_service.db_session, TicketAccess)
        .base()
        .filter(
            TicketAccess.ticket_id == ticket.id,
            TicketAccess.user_sub == user_tuple[0]["sub"],
        )
        .first()
    )

    TicketPolicy(user_tuple).check_delegate(target_user, user_access)

    await ticket_service.delegate_access(
        ticket=ticket,
        granter_sub=user_tuple[0]["sub"],
        grantee_sub=payload.target_user_sub,
        permission=payload.permission,
    )
