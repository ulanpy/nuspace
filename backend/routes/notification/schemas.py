import datetime
from enum import Enum

from pydantic import BaseModel

from backend.core.database.models.common_enums import EntityType


class NotificationType(str, Enum):
    info = "info"


class RequestNotiification(BaseModel):
    title: str
    message: str
    notification_source: EntityType
    receiver_sub: str


class BaseNotification:
    id: int
    title: str
    message: str
    notification_source: EntityType
    receiver_sub: str
    type: NotificationType
    created_at: datetime

    class Config:
        from_attributes = True
