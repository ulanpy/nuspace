from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.schemas import Infra
from backend.core.database.models.sgotinish import Ticket
from backend.modules.notion import schemas, utils
from backend.modules.sgotinish.tickets.interfaces import AbstractNotionService
from backend.modules.notion.consts import (
    NOTION_SYNC_REDIS_PREFIX,
    NOTION_SYNC_TTL_SECONDS,
    NOTION_PAGE_ID_REDIS_PREFIX,
    NOTION_BLOCK_ID_REDIS_PREFIX,
    NOTION_TICKET_DATABASE_ID,
    NOTION_TICKET_URL_TEMPLATE,
)



class NotionService(AbstractNotionService):
    """
    Service responsible for orchestrating Notion sync operations.
    """

    def __init__(self, session: AsyncSession, infra: Infra) -> None:
        self.session = session
        self.infra = infra
        self.database_id = NOTION_TICKET_DATABASE_ID
        self._ticket_url_template: str = NOTION_TICKET_URL_TEMPLATE

    async def notify_notion(self, ticket: Ticket) -> None:
        """
        Syncs newly created ticket with Notion page of Student Government.
        """

        # returns if lock was not acquired
        if not await self._acquire_sync_lock(ticket.id, self.database_id):
            return

        reporter_name = None
        reporter_email = None
        reporter_department = None
        if ticket.author and not ticket.is_anonymous:
            reporter_name = f"{ticket.author.name} {ticket.author.surname}"
            reporter_email = ticket.author.email
            reporter_department = (
                ticket.author.department.name if ticket.author.department else None
            )

        message = schemas.NotionTicketMessage(
            ticket_id=ticket.id,
            title=ticket.title,
            body=ticket.body,
            category=ticket.category,
            ticket_status=ticket.status,
            reporter_name=reporter_name,
            reporter_email=reporter_email,
            reporter_department=reporter_department,
            is_anonymous=ticket.is_anonymous,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            database_id=self.database_id,
            ticket_url=f"{self._ticket_url_template.rstrip()}{ticket.id}",
            operation="create",
        )

        await utils.send(infra=self.infra, notion_data=message)

    async def update_notion(self, ticket: Ticket) -> None:
        """
        Updates existing Notion page when ticket is modified.
        """

        # Check if we have a Notion page ID for this ticket
        notion_page_id: str | None = (
            await self._get_page_id(ticket.id, self.database_id)
            )
            
        if not notion_page_id:
            # if we don't have a page id, we can't update the ticket
            return

        # Check if lock is available (prevents concurrent updates)
        if not await self._acquire_sync_lock(ticket.id, self.database_id):
            return

        reporter_name = None
        reporter_email = None
        reporter_department = None
        if ticket.author and not ticket.is_anonymous:
            reporter_name = f"{ticket.author.name} {ticket.author.surname}"
            reporter_email = ticket.author.email
            reporter_department = (
                ticket.author.department.name if ticket.author.department else None
            )

        # Get block ID if available
        notion_block_id: str | None = await self._get_block_id(ticket.id, self.database_id)

        message = schemas.NotionTicketMessage(
            ticket_id=ticket.id,
            title=ticket.title,
            body=ticket.body,
            category=ticket.category,
            ticket_status=ticket.status,
            reporter_name=reporter_name,
            reporter_email=reporter_email,
            reporter_department=reporter_department,
            is_anonymous=ticket.is_anonymous,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            database_id=self.database_id,
            ticket_url=f"{self._ticket_url_template.rstrip()}{ticket.id}",
            operation="update",
            notion_page_id=notion_page_id,
            notion_block_id=notion_block_id,
        )

        await utils.send(infra=self.infra, notion_data=message)


    def _redis_key(self, ticket_id: int, database_id: str) -> str:
        return f"{NOTION_SYNC_REDIS_PREFIX}:{database_id}:{ticket_id}"

    def _page_id_redis_key(self, ticket_id: int, database_id: str) -> str:
        return f"{NOTION_PAGE_ID_REDIS_PREFIX}:{database_id}:{ticket_id}"

    def _block_id_redis_key(self, ticket_id: int, database_id: str) -> str:
        return f"{NOTION_BLOCK_ID_REDIS_PREFIX}:{database_id}:{ticket_id}"

    async def _acquire_sync_lock(self, ticket_id: int, database_id: str) -> bool:
        key = self._redis_key(ticket_id, database_id)
        
        # True if key was set
        was_set = await self.infra.redis.set(
            name=key, 
            value="pending", 
            ex=NOTION_SYNC_TTL_SECONDS,
            nx=True, # only set if key does not exist
        )
        return bool(was_set)

    async def _get_page_id(self, ticket_id: int, database_id: str) -> str | None:
        """Retrieve the Notion page ID for a given ticket."""
        key = self._page_id_redis_key(ticket_id, database_id)
        page_id = await self.infra.redis.get(key)
        if page_id:
            # Page IDs are stored normalized (without dashes)
            return page_id
        return None

    async def _get_block_id(self, ticket_id: int, database_id: str) -> str | None:
        """Retrieve the Notion block ID for a given ticket."""
        key = self._block_id_redis_key(ticket_id, database_id)
        block_id = await self.infra.redis.get(key)
        if block_id:
            return block_id
        return None

