from datetime import datetime, timezone
from typing import List

from pydantic import BaseModel, field_validator

from backend.common.schemas import MediaResponse
from backend.core.database.models.community import EventStatus, EventTag, RegistrationPolicy


class CommunityEventRequestSchema(BaseModel):
    community_id: int | None = None
    creator_sub: str
    policy: RegistrationPolicy
    name: str
    place: str
    event_datetime: datetime
    description: str
    duration: int
    status: EventStatus | None = EventStatus.personal
    tag: EventTag | None = EventTag.regular

    @field_validator("duration")
    def validate_duration(cls, value):
        if value <= 0:
            raise ValueError("Duration should be positive")
        return value

    @field_validator("event_datetime")
    def validate_event_datetime(cls, value):
        if value <= datetime.now(timezone.utc):
            raise ValueError("Event datetime must be in the future")
        # Convert to naive UTC
        return value.astimezone(timezone.utc).replace(tzinfo=None)


class CommunityEventResponseSchema(BaseModel):
    id: int
    community_id: int
    user_name: str
    user_surname: str
    policy: RegistrationPolicy
    name: str
    place: str
    event_datetime: datetime
    description: str
    duration: int
    status: EventStatus
    tag: EventTag
    created_at: datetime
    updated_at: datetime
    media: List[MediaResponse] = []


class CommunityEventUpdateSchema(BaseModel):
    event_id: int
    name: str | None = None
    place: str | None = None
    description: str | None = None
    duration: int | None = None
    event_datetime: datetime | None = None
    policy: RegistrationPolicy | None = None

    @field_validator("name", "place", "description")
    def validate_emptiness(cls, value):
        if not value or value.strip() == "":
            return None
        return value

    @field_validator("event_datetime")
    def validate_event_datetime(cls, value):
        if value <= datetime.now(timezone.utc):
            raise ValueError("Event datetime must be in the future")
        # Convert to naive UTC
        return value.astimezone(timezone.utc).replace(tzinfo=None)


class ListCommunityEventSchema(BaseModel):
    events: List[CommunityEventResponseSchema] = []
    num_of_pages: int

    @field_validator("num_of_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
