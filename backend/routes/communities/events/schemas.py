from datetime import datetime, timezone
from typing import List, Optional

from fastapi import Query
from pydantic import BaseModel, Field, field_validator

from backend.common.schemas import MediaResponse, ResourcePermissions, ShortUserResponse
from backend.core.database.models import (
    EventScope,
    EventStatus,
    EventTag,
    EventType,
    RegistrationPolicy,
)
from backend.routes.communities.communities.schemas import ShortCommunityResponse


class EventCreateRequest(BaseModel):
    community_id: int | None = Field(
        default=None,
        description=(
            "The community id of the event."
            "If set the event scope is community. otherwise it is personal"
        ),
    )
    creator_sub: str = Field(..., description="The creator sub of the event", example="me")
    policy: RegistrationPolicy = Field(
        ..., description="The policy of the event", example=RegistrationPolicy.open
    )
    name: str = Field(..., description="The name of the event", example="NUspace 2025")
    place: str = Field(..., description="The place of the event", example="NU 3rd block, 3rd floor")
    event_datetime: datetime = Field(..., description="The datetime of the event")
    description: str = Field(
        ..., description="The description of the event", example="NUspace is a community event"
    )
    duration: int = Field(..., description="The duration of the event in minutes", example=120)

    type: EventType = Field(..., description="The type of the event", example=EventType.academic)

    @field_validator("duration")
    def validate_duration(cls, value):
        if value <= 0:
            raise ValueError("Duration should be positive")
        return value

    @field_validator("event_datetime")
    def validate_event_datetime(cls, value):
        if not value.tzinfo:
            value = value.replace(tzinfo=timezone.utc)
        if value <= datetime.now(timezone.utc):
            raise ValueError("Event datetime must be in the future")
        return value.astimezone(timezone.utc).replace(tzinfo=None)


class EnrichedEventCreateRequest(EventCreateRequest):
    """
    Internal model that extends EventCreateRequest with system-controlled fields.
    These fields are set by the backend based on business logic and permissions.
    """

    scope: EventScope = Field(
        ..., description="The scope of the event", example=EventScope.community
    )
    tag: EventTag = Field(..., description="The tag of the event", example=EventTag.regular)

    status: EventStatus = Field(
        ..., description="The status of the event", example=EventStatus.approved
    )


class EventUpdateRequest(BaseModel):
    name: str | None = Field(
        default=None, description="The name of the event", example="NUspace 2025"
    )
    place: str | None = Field(
        default=None, description="The place of the event", example="NU 3rd block, 3rd floor"
    )
    event_datetime: datetime | None = Field(
        default=None, description="The datetime of the event", example="2026-06-12T10:00:00Z"
    )
    description: str | None = Field(
        default=None,
        description="The description of the event",
        example="NUspace is a community event",
    )
    duration: int | None = Field(
        default=None, description="The duration of the event in minutes", example=120
    )
    policy: RegistrationPolicy | None = Field(
        default=None, description="The policy of the event", example=RegistrationPolicy.open
    )
    status: EventStatus | None = Field(
        default=None, description="The status of the event", example=EventStatus.approved
    )
    type: EventType | None = Field(
        default=None, description="The type of the event", example=EventType.academic
    )

    # admin only fields
    tag: EventTag | None = Field(
        default=None, description="The tag of the event. Admin only", example=None
    )

    @field_validator("duration")
    def validate_duration(cls, value):
        if value is not None and value <= 0:
            raise ValueError("Duration should be positive")
        return value

    @field_validator("event_datetime")
    def validate_event_datetime(cls, value):
        if not value.tzinfo:
            value = value.replace(tzinfo=timezone.utc)
        if value <= datetime.now(timezone.utc):
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


class ListEventResponse(BaseModel):
    events: List[EventResponse] = []
    total_pages: int = Query(1, ge=1)
