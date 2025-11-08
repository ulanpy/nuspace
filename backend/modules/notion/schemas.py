from datetime import datetime

from pydantic import BaseModel, Field, field_validator


def normalize_notion_id(value: str) -> str:
    if not isinstance(value, str):
        raise TypeError("Notion identifier must be a string")

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
    body: str | None = Field(None, description="Detailed ticket description")
    category: str | None = Field(None, description="Ticket category name")
    status: str | None = Field(None, description="Ticket status")
    author_sub: str | None = Field(None, description="Author identifier")
    is_anonymous: bool = Field(..., description="Whether the ticket was created anonymously")
    created_at: datetime = Field(..., description="Ticket creation timestamp")
    updated_at: datetime = Field(..., description="Ticket last update timestamp")
    database_id: str = Field(..., description="Target Notion database identifier")
    ticket_url: str | None = Field(None, description="Link back to the ticket inside NU Space")

    @field_validator("database_id", mode="before")
    @classmethod
    def sanitize_database_id(cls, value: str) -> str:
        if not isinstance(value, str):
            raise TypeError("database_id must be a string")

        trimmed = value.strip()
        if not trimmed:
            raise ValueError("database_id cannot be empty")

        normalized = normalize_notion_id(trimmed)
        if len(normalized) != 32:
            raise ValueError("database_id should resolve to a 32 character Notion identifier")

        return normalized

