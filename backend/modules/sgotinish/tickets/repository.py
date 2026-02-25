from typing import TYPE_CHECKING, List

from backend.core.database.models.sgotinish import (
    Conversation,
    Message,
    MessageReadStatus,
    MessageReadStatusAnon,
    Ticket,
    TicketAccess,
)
from backend.core.database.models.user import User, UserRole
from sqlalchemy import and_, func, select
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
        stmt = select(User).where(User.sub == user_sub)
        if with_department:
            stmt = stmt.options(selectinload(User.department))
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def list_ticket_access_by_user_sub(self, user_sub: str) -> list[TicketAccess]:
        stmt = select(TicketAccess).where(TicketAccess.user_sub == user_sub)
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def list_ticket_access_for_ticket_and_user(
        self, ticket_id: int, user_sub: str
    ) -> list[TicketAccess]:
        stmt = select(TicketAccess).where(
            TicketAccess.ticket_id == ticket_id,
            TicketAccess.user_sub == user_sub,
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def get_ticket_access_for_ticket_and_user(
        self, ticket_id: int, user_sub: str
    ) -> TicketAccess | None:
        stmt = select(TicketAccess).where(
            TicketAccess.ticket_id == ticket_id,
            TicketAccess.user_sub == user_sub,
        ).limit(1)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def list_ticket_accesses_for_ticket(self, ticket_id: int) -> list[TicketAccess]:
        stmt = (
            select(TicketAccess)
            .where(TicketAccess.ticket_id == ticket_id)
            .options(selectinload(TicketAccess.user), selectinload(TicketAccess.granter))
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def list_ticket_accesses_for_tickets_and_user(
        self, ticket_ids: list[int], user_sub: str
    ) -> list[TicketAccess]:
        if not ticket_ids:
            return []
        stmt = select(TicketAccess).where(
            TicketAccess.ticket_id.in_(ticket_ids),
            TicketAccess.user_sub == user_sub,
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def add_ticket_accesses(self, accesses: list[TicketAccess]) -> None:
        if not accesses:
            return
        self.db_session.add_all(accesses)
        await self.db_session.flush()

    async def count_tickets(self, filters: list[ColumnElement[bool]]) -> int:
        stmt = select(func.count()).select_from(Ticket).where(*filters)
        result = await self.db_session.execute(stmt)
        return (result.scalar() or 0)

    async def list_tickets(
        self, filters: list[ColumnElement[bool]], size: int, page: int
    ) -> list[Ticket]:
        offset = (page - 1) * size
        stmt = (
            select(Ticket)
            .where(*filters)
            .options(
                selectinload(Ticket.author),
                selectinload(Ticket.conversations).selectinload(Conversation.sg_member),
            )
            .order_by(Ticket.created_at.desc())
            .limit(size)
            .offset(offset)
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def create_ticket(self, ticket_data: "schemas.TicketCreateDTO") -> Ticket:
        instance = Ticket(**ticket_data.model_dump())
        self.db_session.add(instance)
        await self.db_session.flush()
        await self.db_session.refresh(instance)
        stmt = (
            select(Ticket)
            .where(Ticket.id == instance.id)
            .options(
                selectinload(Ticket.author),
                selectinload(Ticket.conversations),
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalar_one()

    async def list_bosses(self) -> list[User]:
        stmt = select(User).where(User.role == UserRole.boss)
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def update_ticket(
        self, ticket: Ticket, ticket_data: "schemas.TicketUpdateDTO"
    ) -> Ticket:
        data_dict = ticket_data.model_dump(exclude_unset=True)
        for field, val in data_dict.items():
            if hasattr(ticket, field):
                setattr(ticket, field, val)
        await self.db_session.flush()
        await self.db_session.refresh(ticket)
        stmt = (
            select(Ticket)
            .where(Ticket.id == ticket.id)
            .options(selectinload(Ticket.author))
        )
        result = await self.db_session.execute(stmt)
        return result.scalar_one()

    async def get_ticket_by_id(self, ticket_id: int) -> Ticket | None:
        stmt = (
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                selectinload(Ticket.author),
                selectinload(Ticket.conversations).selectinload(Conversation.sg_member),
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def get_ticket_by_owner_hash(self, owner_hash: str) -> Ticket | None:
        stmt = (
            select(Ticket)
            .where(Ticket.owner_hash == owner_hash)
            .options(
                selectinload(Ticket.author),
                selectinload(Ticket.conversations).selectinload(Conversation.sg_member),
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()
