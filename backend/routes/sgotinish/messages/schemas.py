from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator
from backend.common.schemas import ResourcePermissions



class BaseMessage(BaseModel):  # ORM to Pydantic
    """Base message schema for database mapping."""

    id: int = Field(..., description="Unique identifier of the message")
    conversation_id: int = Field(..., description="ID of the associated conversation")
    sender_sub: Optional[str] = Field(None, description="Sender identifier")
    body: str = Field(..., description="Content of the message")
    is_from_sg_member: bool = Field(
        ..., description="Whether this message is from an SG member"
    )
    sent_at: datetime = Field(..., description="Timestamp when message was sent")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "title": "Message Base Schema",
            "description": "Base schema for all message-related operations",
        },
    )



class MessageCreateDTO(BaseModel):
    """Schema for creating a new message."""

    conversation_id: int = Field(
        ..., description="ID of the conversation this message belongs to"
    )
    sender_sub: str = Field(
        default="me",
        description="Sender identifier. Use 'me' for current user",
        examples=["me"],
    )
    body: str = Field(
        ...,
        description="Content of the message",
        max_length=5000,
        examples=["Thank you for your help with this issue."],
    )

    @field_validator("body")
    def validate_body(cls, value: str) -> str:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("Message body cannot be empty")
        return value



class _InternalMessageCreateDTO(MessageCreateDTO):
    """Internal schema for creating a message, including server-set fields."""

    is_from_sg_member: bool


class BaseMessageReadStatus(BaseModel):  # ORM to Pydantic
    """Base message read status schema for database mapping."""

    message_id: int = Field(..., description="ID of the associated message")
    user_sub: str = Field(..., description="User identifier")
    read_at: datetime = Field(..., description="Timestamp when message was read")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "title": "Message Read Status Base Schema",
            "description": "Base schema for all message read status-related operations",
        },
    )


class MessageReadStatusCreateDTO(BaseModel):
    """Schema for marking a message as read."""

    message_id: int = Field(..., description="ID of the message to mark as read")
    user_sub: str = Field(
        default="me",
        description="User identifier. Use 'me' for current user",
        examples=["me"],
    )



class MessageResponseDTO(BaseMessage):
    """Complete message response with relationships."""
    message_read_statuses: List[BaseMessageReadStatus] = Field(
        default=None,
        description="Message read status",
    )
    permissions: ResourcePermissions = Field(
        default=ResourcePermissions(),
        description="User permissions for this message",
    )


class ListMessageDTO(BaseModel):
    """Response schema for message listings."""

    messages: List[MessageResponseDTO] = Field(default=[], description="List of messages")
    total_pages: int = Field(..., ge=1, description="Total number of pages")

    @field_validator("total_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value

