import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.core.database.models.chat import ModelType, SenderType


class MessageRequest(BaseModel):
    chat_id: str = str(uuid.uuid4())
    sub: str
    message: str
    sender_type: SenderType = SenderType.user
    model_type: ModelType

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: int
    chat_id: str
    sub: str
    message: str
    message_order: int
    sender_type: SenderType
    model_type: ModelType
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
