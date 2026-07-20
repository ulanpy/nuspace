from __future__ import annotations

from typing import Protocol

from backend.modules.sgotinish.models import Ticket, TicketAccess


class TicketAccessChecker(Protocol):
    async def get_user_ticket_access(
        self, ticket: Ticket, user: tuple[dict, dict]
    ) -> TicketAccess | None: ...
