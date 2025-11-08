from typing import Annotated

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_creds_or_401, get_db_session, get_infra
from backend.common.schemas import Infra
from backend.core.database.models.sgotinish import Ticket
from backend.core.database.models.user import User
from backend.modules.notification.service import NotificationService
from backend.modules.notion.service import NotionService
from backend.modules.sgotinish.conversations.service import ConversationService
from backend.modules.sgotinish.tickets import schemas
from backend.modules.sgotinish.tickets.service import TicketService
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession


def get_ticket_service(
    db_session: AsyncSession = Depends(get_db_session), infra: Infra = Depends(get_infra)
) -> TicketService:
    """Constructs and returns a TicketService with its dependencies."""
    # This is the Composition Root. It knows about the concrete implementations.
    notification_service = NotificationService(db_session, infra)
    conversation_service = ConversationService(db_session)
    notion_service = NotionService(db_session, infra)

    return TicketService(
        db_session=db_session,
        conversation_service=conversation_service,
        notification_service=notification_service,
        notion_service=notion_service,
    )


async def get_ticket(
    ticket_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> Ticket:
    """
    Dependency to validate that a ticket exists and return it.

    Args:
        ticket_id: ID of the ticket to validate
        db_session: Database session

    Returns:
        Ticket: The ticket if found

    Raises:
        HTTPException: 404 if ticket not found
    """
    qb = QueryBuilder(session=db_session, model=Ticket)
    ticket = (
        await qb.base()
        .eager(Ticket.author, Ticket.conversations)
        .filter(Ticket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


async def user_exists_or_404_for_delegation_creation(
    payload: schemas.DelegateAccessPayload,
    db_session: AsyncSession = Depends(get_db_session),
) -> User:
    """
    Dependency to validate that a user from a payload exists.
    """
    qb = QueryBuilder(session=db_session, model=User)
    user = await qb.base().filter(User.sub == payload.target_user_sub).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")
    return user


async def user_exists_or_404_for_ticket_creation(
    ticket_data: schemas.TicketCreateDTO,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
) -> User:
    """
    Dependency to validate that a user exists for ticket creation.

    Args:
        ticket_data: Ticket creation data
        user: Current user principals
        db_session: Database session

    Returns:
        User: The user if found

    Raises:
        HTTPException: 404 if user not found
    """
    qb = QueryBuilder(session=db_session, model=User)
    if ticket_data.author_sub == "me":
        db_user = await qb.base().filter(User.sub == user[0]["sub"]).first()
    else:
        db_user = await qb.base().filter(User.sub == ticket_data.author_sub).first()

    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user
