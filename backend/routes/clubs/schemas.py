from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, field_validator


from backend.routes.google_bucket.schemas import MediaResponse
from backend.core.database.models.club import ClubType, Club, EventPolicy


class ClubResponseSchema(BaseModel):
    id: int
    name: str
    type: ClubType
    description: str
    president: str
    telegram_url: str | None = None
    instagram_url: str = None
    created_at: datetime
    updated_at: datetime
    media: MediaResponse | None = None

    @field_validator('telegram_url', 'instagram_url')
    def validate_url(cls, value):
        if not value.startswith(('http://', 'https://')):
            raise ValueError('Invalid URL format')
        return value


class ClubRequestSchema(BaseModel):
    name: str
    type: ClubType
    description: str
    president: str
    telegram_url: str | None = None
    instagram_url: str | None = None

    @field_validator('telegram_url', 'instagram_url')
    def validate_url(cls, value):
        if not value.startswith(('http://', 'https://')):
            raise ValueError('Invalid URL format')
        return value


class ClubEventResponseSchema(BaseModel):
    id: int 
    club_id: int
    name: str
    place: str
    description: str
    duration: int
    event_datetime: datetime
    policy: EventPolicy
    created_at: datetime
    updated_at: datetime
    media: List[MediaResponse] = []
    
class ClubEventRequestSchema(BaseModel):
    club_id: int
    name: str
    place: str
    description: str
    duration: int
    event_datetime: datetime
    policy: EventPolicy



# class ClubAnnouncement(BaseModel):
#     id: int
#     club_id: int
#     banner: List[MediaResponse]
#     description: str
#     created_at: datetime
#     updated_at: datetime
#
#
# class ClubManagers(BaseModel):
#     id: int
#     club_id: int
#     sub: str
#     updated_at: datetime
