from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.schemas import Infra
from backend.core.configs.config import config
from backend.core.database.models.sgotinish import Ticket
from backend.modules.notion import schemas, utils
from backend.modules.notion.schemas import normalize_notion_id
from backend.modules.sgotinish.tickets.interfaces import AbstractNotionService


class NotionService(AbstractNotionService):
    """
    Service responsible for orchestrating Notion sync operations.
    """

    def __init__(self, session: AsyncSession, infra: Infra) -> None:
        self.session = session
        self.infra = infra
        self.database_id = config.NOTION_TICKET_DATABASE_ID
        self._ticket_url_template: str | None = getattr(config, "NOTION_TICKET_URL_TEMPLATE", None)

    async def notify_ticket_created(self, ticket: Ticket) -> None:
        """
        Publish the created ticket to the Notion queue.
        """
        message = schemas.NotionTicketMessage(
            ticket_id=ticket.id,
            title=ticket.title,
            body=ticket.body,
            category=ticket.category.value,
            status=ticket.status.value,
            author_sub=ticket.author_sub,
            is_anonymous=ticket.is_anonymous,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            database_id=self.database_id,
            ticket_url=self._build_ticket_url(ticket),
        )

        await utils.send(infra=self.infra, notion_data=message)

    def _build_ticket_url(self, ticket: Ticket) -> str | None:
        if not self._ticket_url_template:
            return None

        try:
            return self._ticket_url_template.format(ticket_id=ticket.id)
        except Exception:
            return None


