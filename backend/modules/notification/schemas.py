import datetime

from pydantic import BaseModel, field_validator

from backend.modules.media.models import EntityType

from backend.modules.notification.models import NotificationType


class RequestNotiification(BaseModel):
    title: str
    message: str
    notification_source: EntityType
    receiver_sub: str
    telegram_id: int | None = None
    type: NotificationType
    url: str | None = None

    @field_validator("url")
    def validate_url(cls, v):
        if isinstance(v, str) and (not v.startswith("https://")):
            raise ValueError("URL must start with https://")
        return v


class BaseNotification(BaseModel):
    id: int
    title: str
    message: str
    notification_source: EntityType
    receiver_sub: str
    tg_id: int
    type: NotificationType
    url: str | None = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class _RequestNotification(BaseNotification):
    switch: bool
