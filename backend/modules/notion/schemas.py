from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel, Field, field_validator

from backend.modules.sgotinish.tickets.schemas import TicketCategory, TicketStatus


def normalize_notion_id(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Notion identifier cannot be empty")

    cleaned = cleaned.split("?", 1)[0]
    cleaned = cleaned.split("#", 1)[0]
    cleaned = cleaned.rstrip("/")
    if "/" in cleaned:
        cleaned = cleaned.rsplit("/", 1)[-1]

    parts = [part for part in cleaned.split("-") if part]
    if parts and len(parts[-1]) >= 32:
        cleaned = parts[-1]

    normalized = cleaned.replace("-", "")
    return normalized


class NotionTicketMessage(BaseModel):
    """
    Schema representing a ticket snapshot that should be synced with Notion.
    """

    ticket_id: int = Field(..., description="Unique identifier of the ticket")
    title: str = Field(..., description="Ticket title")
    body: str = Field(..., description="Detailed ticket description")
    category: TicketCategory = Field(..., description="Ticket category name")
    ticket_status: TicketStatus = Field(..., description="Original ticket status in NU Space")
    reporter_name: str | None = Field(None, description="Reporter full name")
    reporter_email: str | None = Field(None, description="Reporter email")
    reporter_department: str | None = Field(None, description="Reporter department name")
    is_anonymous: bool = Field(..., description="Whether the ticket was created anonymously")
    created_at: datetime = Field(..., description="Ticket creation timestamp")
    updated_at: datetime = Field(..., description="Ticket last update timestamp")
    database_id: str = Field(..., description="Target Notion database identifier")
    ticket_url: str | None = Field(None, description="Link back to the ticket inside NU Space")
    operation: str = Field(default="create", description="Operation type: 'create' or 'update'")
    notion_page_id: str | None = Field(None, description="Notion page ID for update operations")
    notion_block_id: str | None = Field(None, description="Notion block ID for update operations")


    @field_validator("database_id", mode="before")
    @classmethod
    def sanitize_database_id(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("database_id cannot be empty")

        normalized = normalize_notion_id(trimmed)
        if len(normalized) != 32:
            raise ValueError("database_id should resolve to a 32 character Notion identifier")

        return normalized


class DatabaseSchema(BaseModel):
    """
    Schema representing the structure of a Notion database.
    """

    title_property: str
    properties: Dict[str, Dict[str, Any]]
