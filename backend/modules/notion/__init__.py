"""
Notion integration module.

Provides services and background workers to sync ticket data with Notion.
"""

from .service import NotionService
from .schemas import NotionTicketMessage, normalize_notion_id

__all__ = ["NotionService", "NotionTicketMessage", "normalize_notion_id"]


