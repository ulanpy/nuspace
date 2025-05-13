import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.core.database.models.chat import ModelType, SenderType


class ChatRequest(BaseModel):
    model_type: ModelType
    model_config = ConfigDict(from_attributes=True)





class MessageRequest(BaseModel):
    chat_id: int
    sender_type: SenderType = SenderType.user
    content: str
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: int
    chat_id: int
    content: str
    sender_type: SenderType
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatResponse(BaseModel):
    pass
