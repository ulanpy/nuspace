from datetime import datetime, timezone
from typing import List

from pydantic import BaseModel, field_validator

from backend.common.schemas import MediaResponse, ShortUserResponse
from backend.core.database.models import (
    EventScope,
    EventStatus,
    EventTag,
    EventType,
    RegistrationPolicy,
)
from backend.routes.communities.communities.schemas import ShortCommunityResponseSchema


class PersonalEventRequestSchema(BaseModel):
    creator_sub: str
    policy: RegistrationPolicy
    name: str
    place: str
    event_datetime: datetime
    description: str
    duration: int

    @field_validator("event_datetime")
    def validate_event_datetime(cls, value):
        if value <= datetime.now(timezone.utc):
            raise ValueError("Event datetime must be in the future")
        # Convert to naive UTC
        return value.astimezone(timezone.utc).replace(tzinfo=None)


class CommunityEventRequestSchema(BaseModel):
    community_id: int | None = None
    creator_sub: str
    policy: RegistrationPolicy
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
        if value <= datetime.now(timezone.utc):
            raise ValueError("Event datetime must be in the future")
        # Convert to naive UTC
        return value.astimezone(timezone.utc).replace(tzinfo=None)


class EventResponseSchema(BaseModel):
    id: int
    community: ShortCommunityResponseSchema | None = None
    creator: ShortUserResponse
    policy: RegistrationPolicy
    name: str
    place: str
    event_datetime: datetime
    description: str
    duration: int
    scope: EventScope
    type: EventType
    status: EventStatus
    tag: EventTag
    created_at: datetime
    updated_at: datetime
    media: List[MediaResponse] = []


class CommunityEventUpdateSchema(BaseModel):
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


class ListEventSchema(BaseModel):
    events: List[EventResponseSchema] = []
    num_of_pages: int

    @field_validator("num_of_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
