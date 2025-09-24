from datetime import date, datetime, timezone
from enum import Enum
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
from backend.routes.campuscurrent.communities.schemas import ShortCommunityResponse


class TimeFilter(str, Enum):
    """Enum for predefined time filters in event queries."""

    UPCOMING = "upcoming"
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"


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
    start_datetime: datetime = Field(
        ..., description="The start datetime of the event", example="2026-06-12T10:00:00Z"
    )
    end_datetime: datetime = Field(
        ..., description="The end datetime of the event", example="2026-06-12T12:00:00Z"
    )
    description: str = Field(
        ..., description="The description of the event", example="NUspace is a community event"
    )

    type: EventType = Field(..., description="The type of the event", example=EventType.academic)
    registration_link: str | None = Field(
        default=None,
        description="The registration link for the event",
        example="https://forms.google.com/event-registration",
    )

    @field_validator("end_datetime")
    def validate_end_datetime(cls, value, info):
        if (
            "start_datetime" in info.data
            and value is not None
            and info.data["start_datetime"] is not None
        ):
            # Ensure both datetimes are timezone-aware for comparison
            start_dt = info.data["start_datetime"]
            if not start_dt.tzinfo:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            if not value.tzinfo:
                value = value.replace(tzinfo=timezone.utc)

            if value <= start_dt:
                raise ValueError("End datetime must be after start datetime")
        return value

    @field_validator("start_datetime", "end_datetime")
    def validate_datetime(cls, value):
        if value is not None:
            if not value.tzinfo:
                value = value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value


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
    start_datetime: datetime | None = Field(
        default=None, description="The start datetime of the event", example="2026-06-12T10:00:00Z"
    )
    end_datetime: datetime | None = Field(
        default=None, description="The end datetime of the event", example="2026-06-12T12:00:00Z"
    )
    description: str | None = Field(
        default=None,
        description="The description of the event",
        example="NUspace is a community event",
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

    registration_link: str | None = Field(
        default=None,
        description="The registration link for the event",
        example="https://forms.google.com/event-registration",
    )

    # admin only fields
    tag: EventTag | None = Field(
        default=None, description="The tag of the event. Admin only", example=None
    )

    @field_validator("end_datetime")
    def validate_end_datetime(cls, value, info):
        if (
            value is not None
            and "start_datetime" in info.data
            and info.data["start_datetime"] is not None
        ):
            # Ensure both datetimes are timezone-aware for comparison
            start_dt = info.data["start_datetime"]
            if not start_dt.tzinfo:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            if not value.tzinfo:
                value = value.replace(tzinfo=timezone.utc)

            if value <= start_dt:
                raise ValueError("End datetime must be after start datetime")
        return value

    @field_validator("start_datetime", "end_datetime")
    def validate_datetime(cls, value):
        if value is not None:
            if not value.tzinfo:
                value = value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

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
    registration_link: Optional[str] = None
    name: str
    place: str
    start_datetime: datetime
    end_datetime: datetime
    description: str
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


class EventFilter(BaseModel):
    """Filter model for event queries with pagination and filtering options."""

    size: int = Field(default=20, ge=1, le=100, description="Number of events per page")
    page: int = Field(default=1, ge=1, description="Page number")
    registration_policy: Optional[RegistrationPolicy] = Field(
        default=None, description="Filter by event registration policy"
    )
    event_scope: Optional[EventScope] = Field(default=None, description="Filter by event scope")
    event_type: Optional[EventType] = Field(default=None, description="Filter by event type")
    event_status: Optional[EventStatus] = Field(default=None, description="Filter by event status")
    community_id: Optional[int] = Field(default=None, description="Filter by specific community")
    time_filter: Optional[TimeFilter] = Field(
        default=None, description="Predefined time filter: upcoming, today, week, month"
    )
    start_date: Optional[date] = Field(
        default=None, description="Start date for filtering events (format: YYYY-MM-DD)"
    )
    end_date: Optional[date] = Field(
        default=None, description="End date for filtering events (format: YYYY-MM-DD)"
    )
    creator_sub: Optional[str] = Field(
        default=None, description="Filter by event creator. Use 'me' for current user's events"
    )
    keyword: Optional[str] = Field(
        default=None, description="Search keyword for event name or description"
    )


class ListEventResponse(BaseModel):
    events: List[EventResponse] = []
    total_pages: int = Query(1, ge=1)
