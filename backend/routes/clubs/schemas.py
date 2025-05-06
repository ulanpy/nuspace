from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator

from backend.core.database.models.club import ClubType, EventPolicy
from backend.routes.google_bucket.schemas import MediaResponse


class ClubRequestSchema(BaseModel):
    name: str
    type: ClubType
    description: str
    president: str
    telegram_url: str
    instagram_url: str

    @field_validator("telegram_url", "instagram_url")
    def validate_url(cls, value):
        if not value.startswith(("http://", "https://")):
            raise ValueError("Invalid URL format")
        return value


class ClubResponseSchema(BaseModel):
    id: int
    name: str
    type: ClubType
    description: str
    president: str
    telegram_url: str
    instagram_url: str
    created_at: datetime
    updated_at: datetime
    media: List[MediaResponse] = []


class ClubUpdateSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    telegram_url: Optional[str] = None
    instagram_url: Optional[str] = None

    @field_validator("name", "description", "telegram_url", "instagram_url")
    def validate_emptiness(cls, value):
        if not value or value.strip() == "":
            return None
        return value


class ClubEventRequestSchema(BaseModel):
    club_id: int
    policy: EventPolicy
    name: str
    place: str
    event_datetime: datetime
    description: str
    duration: int

    @field_validator("duration")
    def validate_duration(cls, value):
        if value <= 0:
            raise ValueError("Duration should be positive")
        return value

    @field_validator("event_datetime")
    def validate_event_datetime(cls, value):
        if value <= datetime.now():
            raise ValueError("Event datetime must be in the future")
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


class ClubEventUpdateSchema(BaseModel):
    name: Optional[str] = None
    place: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    event_datetime: Optional[datetime] = None
    policy: Optional[EventPolicy] = None

    @field_validator("name", "place", "description")
    def validate_emptiness(cls, value):
        if not value or value.strip() == "":
            return None
        return value


class ListEventSchema(BaseModel):
    events: List[ClubEventResponseSchema]
    num_of_pages: int

    @field_validator("num_of_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value


class ListClubSchema(BaseModel):
    events: List[ClubResponseSchema]
    num_of_pages: int

    @field_validator("num_of_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
