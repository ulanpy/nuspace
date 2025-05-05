from datetime import datetime
from typing import List

from pydantic import BaseModel, field_validator

from backend.core.database.models.club import ClubType, EventPolicy
from backend.routes.google_bucket.schemas import MediaResponse


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
    media: MediaResponse | List = []

    @field_validator("telegram_url", "instagram_url")
    def validate_url(cls, value):
        if not value.startswith(("http://", "https://")):
            raise ValueError("Invalid URL format")
        return value


class ClubRequestSchema(BaseModel):
    name: str
    type: ClubType
    description: str
    president: str
    telegram_url: str | None = None
    instagram_url: str | None = None

    @field_validator("telegram_url", "instagram_url")
    def validate_url(cls, value):
        if not value.startswith(("http://", "https://")):
            raise ValueError("Invalid URL format")
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
    policy: EventPolicy
    name: str
    place: str
    event_datetime: datetime
    description: str
    duration: int

    @field_validator("duration")
    def validate_url(cls, value):
        if value <= 0:
            raise ValueError("Duration should be positive")
        return value

    @field_validator("event_datetime")
    def validate_event_datetime(cls, value):
        if value <= datetime.now():
            raise ValueError("Event datetime must be in the future")
        return value


class ListEventSchema(BaseModel):
    events: List[ClubEventResponseSchema]
    num_of_pages: int


class ListClubSchema(BaseModel):
    events: List[ClubResponseSchema]
    num_of_pages: int


