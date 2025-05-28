from datetime import datetime, timezone
from typing import List

from fastapi import Query
from pydantic import BaseModel, field_validator

from backend.common.schemas import MediaResponse, ShortUserResponse
from backend.core.database.models import (
    EventScope,
    EventStatus,
    EventTag,
    EventType,
    RegistrationPolicy,
)
from backend.routes.communities.communities.schemas import ShortCommunityResponse


class EventRequest(BaseModel):
    community_id: int | None = None
    creator_sub: str
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


class BaseEventSchema(BaseModel):  # ORMtoPydantic
    id: int
    community_id: int | None = None
    creator_sub: str
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

    class Config:
        from_attributes = True


class EventResponse(BaseEventSchema):
    media: List[MediaResponse] = []
    community: ShortCommunityResponse | None = None
    creator: ShortUserResponse

    class Config:
        from_attributes = True


class EventUpdate(BaseModel):
    community_id: int | None = None
    creator_sub: str | None = None
    policy: RegistrationPolicy | None = None
    name: str | None = None
    place: str | None = None
    event_datetime: datetime | None = None
    description: str | None = None
    duration: int | None = None
    scope: EventScope | None = None
    type: EventType | None = None
    status: EventStatus | None = None
    tag: EventTag | None = None

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


class ListEvent(BaseModel):
    events: List[EventResponse] = []
    total_pages: int = Query(1, ge=1)
