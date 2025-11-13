"""
Notion integration module.

Provides services and background workers to sync ticket data with Notion.
"""

from .service import NotionService
from .schemas import NotionTicketMessage

__all__ = ["NotionService", "NotionTicketMessage"]


