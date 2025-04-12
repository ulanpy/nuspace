from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, HttpUrl, EmailStr

from backend.routes.google_bucket.schemas import MediaResponse
from backend.core.database.models.club import ClubType, Club, EventPolicy


class ClubResponseSchema(BaseModel):
    id: int
    name: str
    type: ClubType
    description: str
    president_sub: str
    telegram_url: HttpUrl | None = None
    instagram_url: HttpUrl | None = None


class ClubRequestSchema(BaseModel):
    name: str
    type: ClubType
    description: str
    president_sub: str
    picture: MediaResponse
    telegram_url: HttpUrl | None = None
    instagram_url: HttpUrl | None = None
    created_at: datetime
    updated_at: datetime


class ClubEventSchema(BaseModel):
    id: int
    club_id: int
    picture: List[MediaResponse]
    policy: EventPolicy
    name: str
    place: str
    event_datetime: datetime
    description: str
    duration: int
    created_at: datetime
    updated_at: datetime


class ClubAnnouncement(BaseModel):
    id: int
    club_id: int
    banner: List[MediaResponse]
    description: str
    created_at: datetime
    updated_at: datetime


class ClubManagers(BaseModel):
    id: int
    club_id: int
    sub: str
    updated_at: datetime
