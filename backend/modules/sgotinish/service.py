import re

from backend.core.configs.config import config
from backend.modules.sgotinish.models import Ticket, TicketCategory, TicketStatus
from backend.modules.sgotinish.repository import OtinishRepository
from backend.modules.sgotinish.schemas import CategoryStat, OtinishPublicStats
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

MAX_TICKET_BODY_LENGTH = 3500

_CLOSED_STATUSES = frozenset({TicketStatus.closed, TicketStatus.resolved})
_TICKET_HASHTAG = re.compile(r"#тикет(\d+)", re.IGNORECASE)
_TICKET_PROMPT_NUM = re.compile(r"\(#(\d+)\)")
_CLAIM_DEEPLINK = re.compile(r"^otinish_t_(\d+)$")


def is_ticket_open(ticket: Ticket) -> bool:
    return ticket.status not in _CLOSED_STATUSES


def is_assignee(ticket: Ticket, telegram_id: int) -> bool:
    return ticket.assignee_telegram_id is not None and ticket.assignee_telegram_id == telegram_id


def parse_ticket_id_from_text(text: str | None) -> int | None:
    if not text:
        return None
    match = _TICKET_HASHTAG.search(text)
    if match:
        return int(match.group(1))
    # Legacy ForceReply prompt: "... (#9)."
    prompt = _TICKET_PROMPT_NUM.search(text)
    if prompt:
        return int(prompt.group(1))
    return None


def parse_claim_deeplink_ticket_id(args: str | None) -> int | None:
    if not args:
        return None
    match = _CLAIM_DEEPLINK.match(args.strip())
    if not match:
        return None
    return int(match.group(1))


class TicketAlreadyClaimedError(Exception):
    def __init__(self, ticket: Ticket):
        self.ticket = ticket
        super().__init__(f"Ticket #{ticket.id} already claimed")


class OpenChannelExistsError(Exception):
    """User already has an open ticket channel (author or assignee)."""

    def __init__(self, ticket: Ticket):
        self.ticket = ticket
        super().__init__(f"Open channel already exists for ticket #{ticket.id}")


class OtinishService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.repository = OtinishRepository(db_session)

    async def is_linked_student(self, telegram_id: int) -> bool:
        return await self.repository.get_user_by_telegram_id(telegram_id) is not None

    async def get_open_channel(self, telegram_id: int) -> Ticket | None:
        """Active pipe for this user (as student author or SG assignee)."""
        return await self.repository.get_open_channel_for_user(telegram_id)

    async def create_ticket_from_telegram(
        self,
        *,
        telegram_id: int,
        category: TicketCategory,
        body: str,
    ) -> Ticket:
        user = await self.repository.get_user_by_telegram_id(telegram_id)
        if not user:
            raise PermissionError("Telegram account is not linked to a NU student.")

        existing = await self.repository.get_open_ticket_by_author(telegram_id)
        if existing is not None:
            raise OpenChannelExistsError(existing)

        normalized = body.strip()
        if not normalized:
            raise ValueError("Ticket body cannot be empty.")
        if len(normalized) > MAX_TICKET_BODY_LENGTH:
            raise ValueError(f"Message is too long (max {MAX_TICKET_BODY_LENGTH} characters).")

        ministry = await self.repository.get_ministry_by_slug(category.value)
        if ministry is None:
            raise ValueError(f"No active ministry configured for category {category.value}.")

        ticket = await self.repository.create_ticket(
            category=category,
            ministry_id=ministry.id,
            body=normalized,
            author_telegram_id=telegram_id,
        )
        await self.db_session.commit()
        return ticket

    async def resolve_ministry_chat_id(self, ticket: Ticket) -> int | None:
        """
        Ministry telegram_chat_id if set; otherwise TELEGRAM_CHAT_ID fallback (dev/ops chat).

        Always loads ministry by id (no lazy relationship IO in async).
        """
        ministry = await self.repository.get_ministry_by_id(ticket.ministry_id)
        if ministry is not None and ministry.telegram_chat_id is not None:
            return int(ministry.telegram_chat_id)
        fallback = config.TELEGRAM_CHAT_ID
        return int(fallback) if fallback is not None else None

    async def is_ministry_inbox_chat(self, chat_id: int) -> bool:
        if config.TELEGRAM_CHAT_ID is not None and chat_id == int(config.TELEGRAM_CHAT_ID):
            return True
        return chat_id in await self.repository.ministry_chat_ids()

    async def remember_telegram_message(
        self,
        *,
        ticket_id: int,
        chat_id: int,
        telegram_message_id: int,
    ) -> None:
        existing = await self.repository.get_ticket_id_by_telegram_message(
            chat_id=chat_id,
            telegram_message_id=telegram_message_id,
        )
        if existing is not None:
            return
        try:
            await self.repository.add_telegram_message(
                ticket_id=ticket_id,
                chat_id=chat_id,
                telegram_message_id=telegram_message_id,
            )
            await self.db_session.commit()
        except IntegrityError:
            await self.db_session.rollback()

    async def resolve_ticket_id(
        self,
        *,
        chat_id: int,
        telegram_message_id: int,
        fallback_text: str | None = None,
    ) -> int | None:
        ticket_id = await self.repository.get_ticket_id_by_telegram_message(
            chat_id=chat_id,
            telegram_message_id=telegram_message_id,
        )
        if ticket_id is not None:
            return ticket_id
        return parse_ticket_id_from_text(fallback_text)

    async def get_ticket(self, ticket_id: int) -> Ticket | None:
        return await self.repository.get_ticket_by_id(ticket_id)

    def require_assignee(self, ticket: Ticket, telegram_id: int) -> None:
        if not is_assignee(ticket, telegram_id):
            raise PermissionError("Only the ticket assignee can do this.")

    async def claim_ticket(self, *, ticket_id: int, telegram_id: int) -> tuple[Ticket, bool]:
        """
        First successful claimer becomes assignee.

        Returns (ticket, newly_claimed). Idempotent if the same user already owns it.
        Raises TicketAlreadyClaimedError if another user owns it.
        One open assignee channel at a time (anon-chat style).
        """
        ticket = await self.repository.get_ticket_by_id(ticket_id)
        if ticket is None:
            raise LookupError("Ticket not found.")
        if not is_ticket_open(ticket):
            raise ValueError("This ticket is closed.")
        if is_assignee(ticket, telegram_id):
            return ticket, False
        if ticket.assignee_telegram_id is not None:
            raise TicketAlreadyClaimedError(ticket)

        other = await self.repository.get_open_ticket_by_assignee(telegram_id)
        if other is not None and other.id != ticket_id:
            raise OpenChannelExistsError(other)

        won = await self.repository.try_claim_ticket(ticket_id=ticket_id, telegram_id=telegram_id)
        await self.db_session.commit()
        ticket = await self.repository.get_ticket_by_id(ticket_id)
        if ticket is None:
            raise LookupError("Ticket not found.")
        if won or is_assignee(ticket, telegram_id):
            return ticket, bool(won)
        raise TicketAlreadyClaimedError(ticket)

    async def transfer_ticket(
        self,
        *,
        ticket_id: int,
        from_telegram_id: int,
        to_telegram_id: int,
    ) -> Ticket:
        """
        Hand off ownership (no bot UI yet). Keeps claim logic centralized for take-over.
        """
        if from_telegram_id == to_telegram_id:
            ticket = await self.repository.get_ticket_by_id(ticket_id)
            if ticket is None:
                raise LookupError("Ticket not found.")
            return ticket

        ticket = await self.repository.get_ticket_by_id(ticket_id)
        if ticket is None:
            raise LookupError("Ticket not found.")
        if not is_ticket_open(ticket):
            raise ValueError("This ticket is closed.")
        self.require_assignee(ticket, from_telegram_id)
        ticket = await self.repository.set_assignee(ticket, to_telegram_id)
        await self.db_session.commit()
        return ticket

    async def close_ticket_by_author(self, *, ticket_id: int, telegram_id: int) -> Ticket:
        ticket = await self.repository.get_ticket_by_id(ticket_id)
        if ticket is None:
            raise LookupError("Ticket not found.")
        if ticket.author_telegram_id != telegram_id:
            raise PermissionError("Only the author can close this ticket.")
        return await self._close_ticket(ticket)

    async def close_ticket_by_assignee(self, *, ticket_id: int, telegram_id: int) -> Ticket:
        ticket = await self.repository.get_ticket_by_id(ticket_id)
        if ticket is None:
            raise LookupError("Ticket not found.")
        self.require_assignee(ticket, telegram_id)
        return await self._close_ticket(ticket)

    async def close_ticket(self, ticket_id: int) -> Ticket:
        """Close from SG dept chat (any member — ops escape hatch)."""
        ticket = await self.repository.get_ticket_by_id(ticket_id)
        if ticket is None:
            raise LookupError("Ticket not found.")
        return await self._close_ticket(ticket)

    async def _close_ticket(self, ticket: Ticket) -> Ticket:
        if not is_ticket_open(ticket):
            raise ValueError("This ticket is already closed.")
        ticket = await self.repository.set_ticket_status(ticket, TicketStatus.closed)
        await self.db_session.commit()
        return ticket

    async def get_card_message_id(self, *, ticket_id: int, chat_id: int) -> int | None:
        return await self.repository.get_card_message_id(ticket_id=ticket_id, chat_id=chat_id)

    async def get_latest_message_id(self, *, ticket_id: int, chat_id: int) -> int | None:
        return await self.repository.get_latest_message_id(ticket_id=ticket_id, chat_id=chat_id)

    async def get_public_stats(self) -> OtinishPublicStats:
        data = await self.repository.get_public_stats_aggregates()
        return OtinishPublicStats(
            total_tickets=data["total_tickets"],
            answered_tickets=data["answered_tickets"],
            closed_tickets=data["closed_tickets"],
            tickets_last_7_days=data["tickets_last_7_days"],
            tickets_last_30_days=data["tickets_last_30_days"],
            unique_students=data["unique_students"],
            by_category=[CategoryStat(**item) for item in data["by_category"]],
        )
