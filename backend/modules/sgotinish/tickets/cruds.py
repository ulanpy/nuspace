from typing import List
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models.sgotinish import Conversation, Message, MessageReadStatus
from backend.core.database.models.sgotinish import Ticket


async def get_unread_messages_count_for_tickets(
    db_session: AsyncSession,
    tickets: List[Ticket],
    user_sub: str,
) -> dict[int, int]:
    """
    Efficiently fetch unread message counts for all tickets

    Example:
    {
        ticket_id: unread_count,
        ticket_id: unread_count,
        ...
    }
    """
    # Efficiently fetch unread message counts for all tickets
    unread_counts_map: dict[int, int] = {}
    if tickets:
        ticket_ids = [ticket.id for ticket in tickets]
        current_user_sub = user_sub

        unread_counts_query = (
            select(
                Conversation.ticket_id,
                func.count(Message.id).label("unread_count"),
            )
            .join(Message, Conversation.id == Message.conversation_id)
            .outerjoin(
                MessageReadStatus,
                and_(
                    Message.id == MessageReadStatus.message_id,
                    MessageReadStatus.user_sub == current_user_sub,
                ),
            )
            .where(
                Conversation.ticket_id.in_(ticket_ids),
                Message.sender_sub != current_user_sub,
                MessageReadStatus.message_id.is_(None),
            )
            .group_by(Conversation.ticket_id)
        )

        unread_counts_result = await db_session.execute(unread_counts_query)
        unread_counts_map = {
            ticket_id: unread_count for ticket_id, unread_count in unread_counts_result
        }
    return unread_counts_map