from typing import TYPE_CHECKING, List

from backend.common.cruds import QueryBuilder
from backend.core.database.models.sgotinish import (
    Conversation,
    Message,
    MessageReadStatus,
    MessageReadStatusAnon,
    Ticket,
    TicketAccess,
)
from backend.core.database.models.user import User, UserRole
from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

if TYPE_CHECKING:
    from backend.modules.sgotinish.tickets import schemas


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


async def get_unread_messages_count_for_tickets_by_owner_hash(
    db_session: AsyncSession,
    tickets: List[Ticket],
    owner_hash: str,
) -> dict[int, int]:
    """
    Fetch unread message counts for anonymous ticket owners (by owner_hash).
    Only SG-member messages should be counted as unread.
    """
    unread_counts_map: dict[int, int] = {}
    if tickets:
        ticket_ids = [ticket.id for ticket in tickets]
        unread_counts_query = (
            select(
                Conversation.ticket_id,
                func.count(Message.id).label("unread_count"),
            )
            .join(Message, Conversation.id == Message.conversation_id)
            .outerjoin(
                MessageReadStatusAnon,
                and_(
                    Message.id == MessageReadStatusAnon.message_id,
                    MessageReadStatusAnon.owner_hash == owner_hash,
                ),
            )
            .where(
                Conversation.ticket_id.in_(ticket_ids),
                Message.is_from_sg_member.is_(True),
                MessageReadStatusAnon.message_id.is_(None),
            )
            .group_by(Conversation.ticket_id)
        )

        unread_counts_result = await db_session.execute(unread_counts_query)
        unread_counts_map = {
            ticket_id: unread_count for ticket_id, unread_count in unread_counts_result
        }
    return unread_counts_map


class TicketRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def get_user_by_sub(self, user_sub: str, with_department: bool = False) -> User | None:
        qb = QueryBuilder(self.db_session, User).base().filter(User.sub == user_sub)
        if with_department:
            qb = qb.eager(User.department)
        return await qb.first()

    async def list_ticket_access_by_user_sub(self, user_sub: str) -> list[TicketAccess]:
        return await (
            QueryBuilder(self.db_session, TicketAccess)
            .base()
            .filter(TicketAccess.user_sub == user_sub)
            .all()
        )

    async def list_ticket_access_for_ticket_and_user(
        self, ticket_id: int, user_sub: str
    ) -> list[TicketAccess]:
        return await (
            QueryBuilder(self.db_session, TicketAccess)
            .base()
            .filter(TicketAccess.ticket_id == ticket_id, TicketAccess.user_sub == user_sub)
            .all()
        )

    async def get_ticket_access_for_ticket_and_user(
        self, ticket_id: int, user_sub: str
    ) -> TicketAccess | None:
        return await (
            QueryBuilder(self.db_session, TicketAccess)
            .base()
            .filter(TicketAccess.ticket_id == ticket_id, TicketAccess.user_sub == user_sub)
            .first()
        )

    async def list_ticket_accesses_for_ticket(self, ticket_id: int) -> list[TicketAccess]:
        return await (
            QueryBuilder(self.db_session, TicketAccess)
            .base()
            .filter(TicketAccess.ticket_id == ticket_id)
            .eager(TicketAccess.user, TicketAccess.granter)
            .all()
        )

    async def list_ticket_accesses_for_tickets_and_user(
        self, ticket_ids: list[int], user_sub: str
    ) -> list[TicketAccess]:
        if not ticket_ids:
            return []
        return await (
            QueryBuilder(self.db_session, TicketAccess)
            .base()
            .filter(
                TicketAccess.ticket_id.in_(ticket_ids),
                TicketAccess.user_sub == user_sub,
            )
            .all()
        )

    async def add_ticket_accesses(self, accesses: list[TicketAccess]) -> None:
        if not accesses:
            return
        await QueryBuilder(self.db_session, TicketAccess).add_orm_list(accesses)

    async def count_tickets(self, filters: list[ColumnElement[bool]]) -> int:
        return await (
            QueryBuilder(self.db_session, Ticket)
            .blank(model=Ticket)
            .base(count=True)
            .filter(*filters)
            .count()
        )

    async def list_tickets(
        self, filters: list[ColumnElement[bool]], size: int, page: int
    ) -> list[Ticket]:
        return await (
            QueryBuilder(self.db_session, Ticket)
            .base()
            .filter(*filters)
            .eager(Ticket.author)
            .option(selectinload(Ticket.conversations).selectinload(Conversation.sg_member))
            .paginate(size, page)
            .order(Ticket.created_at.desc())
            .all()
        )

    async def create_ticket(self, ticket_data: "schemas.TicketCreateDTO") -> Ticket:
        return await QueryBuilder(self.db_session, Ticket).add(
            data=ticket_data,
            preload=[Ticket.author, Ticket.conversations],
        )

    async def list_bosses(self) -> list[User]:
        return await (
            QueryBuilder(self.db_session, User)
            .blank(model=User)
            .base()
            .filter(User.role == UserRole.boss)
            .all()
        )

    async def update_ticket(
        self, ticket: Ticket, ticket_data: "schemas.TicketUpdateDTO"
    ) -> Ticket:
        return await QueryBuilder(self.db_session, Ticket).update(
            instance=ticket,
            update_data=ticket_data,
            preload=[Ticket.author],
        )

    async def get_ticket_by_id(self, ticket_id: int) -> Ticket | None:
        return await (
            QueryBuilder(self.db_session, Ticket)
            .base()
            .filter(Ticket.id == ticket_id)
            .eager(Ticket.author)
            .option(selectinload(Ticket.conversations).selectinload(Conversation.sg_member))
            .first()
        )

    async def get_ticket_by_owner_hash(self, owner_hash: str) -> Ticket | None:
        return await (
            QueryBuilder(self.db_session, Ticket)
            .base()
            .filter(Ticket.owner_hash == owner_hash)
            .eager(Ticket.author)
            .option(selectinload(Ticket.conversations).selectinload(Conversation.sg_member))
            .first()
        )
