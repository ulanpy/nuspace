from __future__ import annotations

from typing import Protocol

from backend.core.database.models.sgotinish import Ticket, TicketAccess


class DelegationAccessNotifier(Protocol):
    async def notify_ticket_access_granted(self, ticket: Ticket, access: TicketAccess) -> None: ...


class DelegationNotionSync(Protocol):
    async def notify_notion(self, ticket: Ticket) -> None: ...
