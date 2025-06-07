from datetime import datetime, timezone
from typing import List, Optional

from fastapi import Query
from pydantic import BaseModel, field_validator, model_validator

from backend.common.schemas import MediaResponse, ShortUserResponse
from backend.core.database.models import (
    EventScope,
    EventStatus,
    EventTag,
    EventType,
    RegistrationPolicy,
)
from backend.routes.communities.communities.schemas import ShortCommunityResponse


from backend.common.schemas import ResourcePermissions


class EventCreateRequest(BaseModel):
    community_id: Optional[int] = None
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
    tag: EventTag = EventTag.regular  # Default to regular for non-admin users

    @field_validator("duration")
    def validate_duration(cls, value):
        if value <= 0:
            raise ValueError("Duration should be positive")
        return value

    @field_validator("event_datetime")
    def validate_event_datetime(cls, value):
        if value <= datetime.now(timezone.utc):
            raise ValueError("Event datetime must be in the future")
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    """The reason why i placed this validator outside of the policy is because 
    this is logical validation and not a policy validation"""

    @model_validator(mode="after")
    def validate_scope_and_community(self):
        if self.scope == EventScope.personal and self.community_id is not None:
            raise ValueError("Personal events cannot have a community_id")
        if self.scope == EventScope.community and self.community_id is None:
            raise ValueError("Community events must have a community_id")
        return self


class EventUpdateRequest(BaseModel):
    name: Optional[str] = None
    place: Optional[str] = None
    event_datetime: Optional[datetime] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    policy: Optional[RegistrationPolicy] = None
    status: Optional[EventStatus] = None
    type: Optional[EventType] = None

    @field_validator("duration")
    def validate_duration(cls, value):
        if value is not None and value <= 0:
            raise ValueError("Duration should be positive")
        return value

    @field_validator("event_datetime")
    def validate_event_datetime(cls, value):
        if value is not None and value <= datetime.now(timezone.utc):
            raise ValueError("Event datetime must be in the future")
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    @field_validator("name", "place", "description")
    def validate_string_fields(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            value = value.strip()
            if not value:
                return None
        return value


class BaseEventSchema(BaseModel):  # ORMtoPydantic
    id: int
    community_id: Optional[int] = None
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
    community: Optional[ShortCommunityResponse] = None
    creator: ShortUserResponse
    permissions: ResourcePermissions = ResourcePermissions()

    class Config:
        from_attributes = True


class ListEvent(BaseModel):
    events: List[EventResponse] = []
    total_pages: int = Query(1, ge=1)
