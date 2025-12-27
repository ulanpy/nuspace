from datetime import datetime

from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator
from backend.core.database.models.sgotinish import ConversationStatus
from backend.common.schemas import ShortUserResponse, ResourcePermissions
from typing import List




class BaseConversation(BaseModel):  # ORM to Pydantic
    """Base conversation schema for database mapping."""

    id: int = Field(..., description="Unique identifier of the conversation")
    ticket_id: int = Field(..., description="ID of the associated ticket")
    sg_member_sub: Optional[str] = Field(None, description="SG member identifier")
    status: ConversationStatus = Field(..., description="Status of the conversation")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "title": "Conversation Base Schema",
            "description": "Base schema for all conversation-related operations",
        },
    )
    
class ConversationResponseDTO(BaseConversation):
    """Complete conversation response with relationships."""

    sg_member: Optional[ShortUserResponse] = Field(
        default=None,
        description="SG member information",
    )
    messages_count: int = Field(default=0, description="Number of messages in the conversation")
    permissions: ResourcePermissions = Field(
        default=ResourcePermissions(),
        description="User permissions for this conversation",
    )


class ListConversationDTO(BaseModel):
    """Response schema for conversation listings with pagination metadata."""

    items: List[ConversationResponseDTO] = Field(default_factory=list, description="List of conversations")
    total_pages: int = Field(..., ge=1, description="Total number of pages")
    total: int = Field(..., ge=0, description="Total number of conversations")
    page: int = Field(..., ge=1, description="Current page number")
    size: int = Field(..., ge=1, description="Page size used for this response")
    has_next: bool = Field(..., description="Whether another page exists")

    @field_validator("total_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value

class ConversationCreateDTO(BaseModel):
    """Public schema for creating a new conversation."""

    ticket_id: int = Field(..., description="ID of the ticket this conversation belongs to")

class _ConversationCreateDTO(ConversationCreateDTO):
    """Internal schema for creating a new conversation."""

    sg_member_sub: str = Field(
        default="me",
        description="SG member identifier. Use 'me' for current user",
        examples=["me"],
    )


class ConversationUpdateDTO(BaseModel):
    """Schema for updating a conversation."""

    status: Optional[ConversationStatus] = Field(
        default=None,
        description="New status of the conversation",
    )

