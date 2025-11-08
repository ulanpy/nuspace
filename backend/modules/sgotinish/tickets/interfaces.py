from abc import ABC, abstractmethod
from typing import List

from backend.core.database.models.sgotinish import Ticket, TicketAccess, Message
from backend.core.database.models.user import User
from backend.modules.sgotinish.tickets import schemas


class AbstractNotificationService(ABC):
    @abstractmethod
    async def notify_new_ticket_to_bosses(self, ticket: Ticket, bosses: List[User]) -> None:
        """Notifies bosses about a new ticket."""
        pass

    async def notify_ticket_access_granted(self, ticket: Ticket, access: TicketAccess) -> None:
        """Notifies user about a ticket access granted."""
        pass

    @abstractmethod
    async def notify_ticket_updated(self, ticket: Ticket) -> None:
        """Notifies user about a ticket updated."""
        pass

    @abstractmethod
    async def notify_new_message(self, message: Message) -> None:
        """Notifies user about a new message."""
        pass


class AbstractNotionService(ABC):
    @abstractmethod
    async def notify_ticket_created(self, ticket: Ticket) -> None:
        """Syncs newly created ticket with Notion page of Student Government."""
        pass

class AbstractConversationService(ABC):
    @abstractmethod
    async def get_conversation_dtos_for_tickets(
        self, tickets: List[Ticket], user: tuple[dict, dict]
    ) -> dict[int, List[schemas.ConversationResponseDTO]]:
        """Gets conversation DTOs for a list of tickets."""
        pass

