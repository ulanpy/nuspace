from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict, field_validator
from backend.core.database.models.sgotinish import TicketCategory, TicketStatus
from typing import Optional, List
from backend.common.schemas import ResourcePermissions, ShortUserResponse
from backend.modules.sgotinish.conversations.schemas import ConversationResponseDTO
from backend.core.database.models.sgotinish import PermissionType
from backend.core.database.models.user import UserRole


class DepartmentResponseDTO(BaseModel):
    """DTO for department information."""

    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class SGUserResponse(BaseModel):
    """DTO for SG user information."""

    user: ShortUserResponse
    department_name: str
    role: UserRole


class BaseTicket(BaseModel):  # ORM to Pydantic
    """Base ticket schema for database mapping."""

    id: int = Field(..., description="Unique identifier of the ticket")
    author_sub: Optional[str] = Field(None, description="Author identifier")
    category: TicketCategory = Field(..., description="Category of the ticket")
    title: str = Field(..., description="Title of the ticket")
    body: str = Field(..., description="Detailed description of the issue")
    status: TicketStatus = Field(..., description="Current status of the ticket")
    is_anonymous: bool = Field(..., description="Whether the ticket is anonymous")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "title": "Ticket Base Schema",
            "description": "Base schema for all ticket-related operations",
        },
    )

class TicketCreateDTO(BaseModel):
    """Schema for creating a new ticket."""

    author_sub: Optional[str] = Field(
        default="me",
        description="Author identifier. Use 'me' for current user, or null if anonymous",
        examples=["me"],
    )
    category: TicketCategory = Field(
        ...,
        description="Category of the ticket",
        examples=[TicketCategory.academic],
    )
    title: str = Field(
        ...,
        description="Title of the ticket",
        min_length=1,
        max_length=200,
        examples=["Need help with course registration"],
    )
    body: str = Field(
        ...,
        description="Detailed description of the issue",
        max_length=5000,
        examples=["I am having trouble registering for CSCI 152 course..."],
    )
    is_anonymous: bool = Field(
        default=False,
        description="Whether the ticket should be anonymous. If true, author_sub will be ignored.",
        examples=[False],
    )

    @field_validator("title", "body")
    def validate_string_fields(cls, value: str) -> str:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("Field cannot be empty")
        return value


class TicketUpdateDTO(BaseModel):
    """Schema for updating a ticket."""
    status: Optional[TicketStatus] = Field(None, description="Current status of the ticket")

class DelegateAccessPayload(BaseModel):
    """Schema for delegating ticket access."""
    target_user_sub: str = Field(..., description="The user sub to grant access to")
    permission: PermissionType = Field(..., description="The permission level to grant")


class TicketResponseDTO(BaseTicket):
    """Complete ticket response with relationships."""

    author: Optional[ShortUserResponse] = Field(
        default=None,
        description="Author information (null if anonymous or deleted user)",
    )
    
    permissions: ResourcePermissions = Field(
        default=ResourcePermissions(),
        description="User permissions for this ticket",
    )

    ticket_access: PermissionType | None = None

    unread_count: int = Field(
        default=0,
        description="Number of unread messages in this ticket",
    )

    conversations: List[ConversationResponseDTO] = Field(default=[], description="List of conversations")


class ListTicketDTO(BaseModel):
    """Response schema for ticket listings."""

    tickets: List[TicketResponseDTO] = Field(default=[], description="List of tickets")
    total_pages: int = Field(..., ge=1, description="Total number of pages")

    @field_validator("total_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value

