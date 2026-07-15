from __future__ import annotations

from typing import Protocol

from backend.core.database.models.sgotinish import Message, Ticket, TicketAccess


class NewMessageNotifier(Protocol):
    async def notify_new_message(self, message: Message) -> None: ...


class TicketAccessChecker(Protocol):
    async def get_user_ticket_access(
        self, ticket: Ticket, user: tuple[dict, dict]
    ) -> TicketAccess | None: ...
