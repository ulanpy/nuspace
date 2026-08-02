from datetime import timedelta

from backend.common.datetime_utils import utc_now
from backend.modules.auth.models import User
from backend.modules.sgotinish.models import (
    SgMinistry,
    Ticket,
    TicketCategory,
    TicketStatus,
    TicketTelegramMessage,
)
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

_CLOSED = (TicketStatus.closed, TicketStatus.resolved)


class OtinishRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def get_user_by_telegram_id(self, telegram_id: int) -> User | None:
        result = await self.db_session.execute(select(User).where(User.telegram_id == telegram_id))
        return result.scalars().first()

    async def get_ministry_by_slug(self, slug: str) -> SgMinistry | None:
        result = await self.db_session.execute(
            select(SgMinistry).where(SgMinistry.slug == slug, SgMinistry.is_active.is_(True))
        )
        return result.scalars().first()

    async def get_ministry_by_id(self, ministry_id: int) -> SgMinistry | None:
        result = await self.db_session.execute(
            select(SgMinistry).where(SgMinistry.id == ministry_id)
        )
        return result.scalars().first()

    async def ministry_chat_ids(self) -> list[int]:
        result = await self.db_session.execute(
            select(SgMinistry.telegram_chat_id).where(
                SgMinistry.is_active.is_(True),
                SgMinistry.telegram_chat_id.is_not(None),
            )
        )
        return [chat_id for chat_id in result.scalars().all() if chat_id is not None]

    async def create_ticket(
        self,
        *,
        category: TicketCategory,
        ministry_id: int,
        body: str,
        author_telegram_id: int,
    ) -> Ticket:
        ticket = Ticket(
            category=category,
            ministry_id=ministry_id,
            body=body,
            status=TicketStatus.open,
            author_telegram_id=author_telegram_id,
        )
        self.db_session.add(ticket)
        await self.db_session.flush()
        await self.db_session.refresh(ticket)
        return ticket

    async def get_ticket_by_id(self, ticket_id: int) -> Ticket | None:
        result = await self.db_session.execute(
            select(Ticket).where(Ticket.id == ticket_id).options(selectinload(Ticket.ministry))
        )
        return result.scalars().first()

    async def get_open_ticket_by_author(self, author_telegram_id: int) -> Ticket | None:
        result = await self.db_session.execute(
            select(Ticket)
            .where(
                Ticket.author_telegram_id == author_telegram_id,
                Ticket.status.notin_(_CLOSED),
            )
            .order_by(Ticket.created_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    async def get_open_ticket_by_assignee(self, assignee_telegram_id: int) -> Ticket | None:
        result = await self.db_session.execute(
            select(Ticket)
            .where(
                Ticket.assignee_telegram_id == assignee_telegram_id,
                Ticket.status.notin_(_CLOSED),
            )
            .order_by(Ticket.created_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    async def get_open_channel_for_user(self, telegram_id: int) -> Ticket | None:
        """Open ticket where this user is author or assignee (at most one expected)."""
        as_author = await self.get_open_ticket_by_author(telegram_id)
        if as_author is not None:
            return as_author
        return await self.get_open_ticket_by_assignee(telegram_id)

    async def set_ticket_status(self, ticket: Ticket, status: TicketStatus) -> Ticket:
        ticket.status = status
        await self.db_session.flush()
        await self.db_session.refresh(ticket)
        return ticket

    async def try_claim_ticket(self, *, ticket_id: int, telegram_id: int) -> bool:
        """
        Atomically claim an unassigned open ticket.

        Returns True if this caller won the claim.
        """
        result = await self.db_session.execute(
            update(Ticket)
            .where(
                Ticket.id == ticket_id,
                Ticket.assignee_telegram_id.is_(None),
                Ticket.status.notin_(_CLOSED),
            )
            .values(
                assignee_telegram_id=telegram_id,
                status=TicketStatus.in_progress,
            )
        )
        await self.db_session.flush()
        return bool(result.rowcount)

    async def set_assignee(self, ticket: Ticket, telegram_id: int) -> Ticket:
        """Overwrite assignee (used by transfer). Caller enforces policy."""
        ticket.assignee_telegram_id = telegram_id
        if ticket.status == TicketStatus.open:
            ticket.status = TicketStatus.in_progress
        await self.db_session.flush()
        await self.db_session.refresh(ticket)
        return ticket

    async def add_telegram_message(
        self,
        *,
        ticket_id: int,
        chat_id: int,
        telegram_message_id: int,
    ) -> TicketTelegramMessage:
        row = TicketTelegramMessage(
            ticket_id=ticket_id,
            chat_id=chat_id,
            telegram_message_id=telegram_message_id,
        )
        self.db_session.add(row)
        await self.db_session.flush()
        return row

    async def get_ticket_id_by_telegram_message(
        self, *, chat_id: int, telegram_message_id: int
    ) -> int | None:
        result = await self.db_session.execute(
            select(TicketTelegramMessage.ticket_id).where(
                TicketTelegramMessage.chat_id == chat_id,
                TicketTelegramMessage.telegram_message_id == telegram_message_id,
            )
        )
        return result.scalars().first()

    async def get_card_message_id(self, *, ticket_id: int, chat_id: int) -> int | None:
        """Earliest tracked message in a chat for this ticket (the card)."""
        result = await self.db_session.execute(
            select(TicketTelegramMessage.telegram_message_id)
            .where(
                TicketTelegramMessage.ticket_id == ticket_id,
                TicketTelegramMessage.chat_id == chat_id,
            )
            .order_by(TicketTelegramMessage.created_at.asc(), TicketTelegramMessage.id.asc())
            .limit(1)
        )
        return result.scalars().first()

    async def get_latest_message_id(self, *, ticket_id: int, chat_id: int) -> int | None:
        """Latest tracked message in a chat for this ticket (reply target)."""
        result = await self.db_session.execute(
            select(TicketTelegramMessage.telegram_message_id)
            .where(
                TicketTelegramMessage.ticket_id == ticket_id,
                TicketTelegramMessage.chat_id == chat_id,
            )
            .order_by(TicketTelegramMessage.created_at.desc(), TicketTelegramMessage.id.desc())
            .limit(1)
        )
        return result.scalars().first()

    async def get_public_stats_aggregates(self) -> dict:
        """Anonymous counters for the landing page (no PII)."""
        now = utc_now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        totals = await self.db_session.execute(
            select(
                func.count().label("total"),
                func.count()
                .filter(Ticket.assignee_telegram_id.is_not(None))
                .label("answered"),
                func.count().filter(Ticket.status.in_(_CLOSED)).label("closed"),
                func.count().filter(Ticket.created_at >= week_ago).label("last_7"),
                func.count().filter(Ticket.created_at >= month_ago).label("last_30"),
                func.count(func.distinct(Ticket.author_telegram_id)).label("unique_students"),
            ).select_from(Ticket)
        )
        row = totals.one()

        by_cat = await self.db_session.execute(
            select(
                Ticket.category,
                SgMinistry.name,
                func.count().label("count"),
            )
            .join(SgMinistry, SgMinistry.id == Ticket.ministry_id)
            .group_by(Ticket.category, SgMinistry.name)
            .order_by(func.count().desc(), SgMinistry.name.asc())
        )

        return {
            "total_tickets": int(row.total or 0),
            "answered_tickets": int(row.answered or 0),
            "closed_tickets": int(row.closed or 0),
            "tickets_last_7_days": int(row.last_7 or 0),
            "tickets_last_30_days": int(row.last_30 or 0),
            "unique_students": int(row.unique_students or 0),
            "by_category": [
                {
                    "slug": (
                        cat.value if isinstance(cat, TicketCategory) else str(cat)
                    ),
                    "name": name,
                    "count": int(count),
                }
                for cat, name, count in by_cat.all()
            ],
        }
