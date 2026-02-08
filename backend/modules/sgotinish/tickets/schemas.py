from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
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
    owner_hash: Optional[str] = Field(
        default=None,
        description="SHA256 hash of the client's secret key for anonymous ticket access.",
        examples=["2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"],
        min_length=64,
        max_length=64,
    )

    @field_validator("title", "body")
    def validate_string_fields(cls, value: str) -> str:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("Field cannot be empty")
        return value

    @field_validator("owner_hash")
    def validate_owner_hash(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().lower()
        if len(normalized) != 64:
            raise ValueError("owner_hash must be a 64-character hex SHA256 digest")
        if any(ch not in "0123456789abcdef" for ch in normalized):
            raise ValueError("owner_hash must be a hex SHA256 digest")
        return normalized

    @model_validator(mode="after")
    def validate_anonymous_fields(self):
        if self.is_anonymous:
            if not self.owner_hash:
                raise ValueError("owner_hash is required for anonymous tickets")
        else:
            self.owner_hash = None
        return self


class TicketUpdateDTO(BaseModel):
    """Schema for updating a ticket."""
    status: Optional[TicketStatus] = Field(None, description="Current status of the ticket")

class TicketOwnerHashDTO(BaseModel):
    owner_hash: str = Field(
        ...,
        description="SHA256 hash of the client's secret key for anonymous ticket access.",
        min_length=64,
        max_length=64,
    )



class DelegateAccessPayload(BaseModel):
    """Schema for delegating ticket access."""
    target_user_sub: str = Field(..., description="The user sub to grant access to")
    permission: PermissionType = Field(..., description="The permission level to grant")


class TicketAccessEntryDTO(BaseModel):
    user: ShortUserResponse
    permission: PermissionType
    granted_by: Optional[ShortUserResponse] = None
    granted_at: datetime


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
    access_list: List[TicketAccessEntryDTO] = Field(
        default_factory=list,
        description="SG access list for this ticket",
    )


class ListTicketDTO(BaseModel):
    """Response schema for ticket listings with pagination metadata."""

    items: List[TicketResponseDTO] = Field(default_factory=list, description="List of tickets")
    total_pages: int = Field(..., ge=1, description="Total number of pages")
    total: int = Field(..., ge=0, description="Total number of tickets")
    page: int = Field(..., ge=1, description="Current page number")
    size: int = Field(..., ge=1, description="Page size used for this response")
    has_next: bool = Field(..., description="Whether there is another page available")

    @field_validator("total_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
