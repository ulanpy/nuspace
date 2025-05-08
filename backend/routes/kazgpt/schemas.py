from datetime import datetime
from typing import List

from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum
from backend.core.database.models.chat import MessageSenderType


class ChatRequestSchema(BaseModel):
    title: str

    model_config = ConfigDict(from_attributes=True)


class MessageRequestSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponseSchema(BaseModel):
    id: int
    sender_type: MessageSenderType
    content: str


class ChatResponseSchema(BaseModel):
    id: int
    user_name: str
    user_surname: str
    user_telegram_id: int
    title: str
    messages: List[MessageResponseSchema] = []
    updated_at: datetime
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ChatUpdateSchema(BaseModel):
    chat_id: int
    title: str | None = None

    class Config:
        from_attributes = True  # Make sure it can be used with SQLAlchemy models
