from __future__ import annotations

from typing import Protocol

from backend.modules.sgotinish.models import Message, Ticket
from backend.modules.auth.models import User
from backend.modules.sgotinish.tickets import schemas


class TicketNotifier(Protocol):
    async def notify_new_ticket_to_bosses(self, ticket: Ticket, bosses: list[User]) -> None: ...

    async def notify_ticket_updated(self, ticket: Ticket) -> None: ...

    async def notify_new_message(self, message: Message) -> None: ...


class TicketNotionSync(Protocol):
    async def update_notion(self, ticket: Ticket) -> None: ...


class TicketConversationLookup(Protocol):
    async def get_conversation_dtos_for_tickets(
        self, tickets: list[Ticket], user: tuple[dict, dict]
    ) -> dict[int, list[schemas.ConversationResponseDTO]]: ...
