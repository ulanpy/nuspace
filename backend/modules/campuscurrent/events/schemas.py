from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from backend.common.datetime_utils import almaty_to_utc
from backend.common.schemas import ResourcePermissions, ShortUserResponse
from backend.modules.campuscurrent.models import (
    EventAccessPurpose,
    EventStatus,
    EventTag,
    EventType,
    RegistrationPolicy,
)
from backend.modules.media.schemas import MediaResponse


class TimeFilter(str, Enum):
    """Enum for predefined time filters in event queries."""

    UPCOMING = "upcoming"
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"


class EventCreateRequest(BaseModel):
    creator_sub: str = Field(..., description="The creator sub of the event", example="me")
    policy: RegistrationPolicy = Field(
        ..., description="The policy of the event", example=RegistrationPolicy.open
    )
    name: str = Field(..., description="The name of the event", example="nuspace 2025")
    place: str = Field(..., description="The place of the event", example="NU 3rd block, 3rd floor")
    start_datetime: datetime = Field(
        ...,
        description="Event start as UTC instant (ISO-8601 with offset). Naive values are Asia/Almaty.",
        example="2026-06-12T10:00:00+05:00",
    )
    end_datetime: datetime = Field(
        ...,
        description="Event end as UTC instant (ISO-8601 with offset). Naive values are Asia/Almaty.",
        example="2026-06-12T12:00:00+05:00",
    )
    description: str = Field(
        ..., description="The description of the event", example="nuspace is a community event"
    )

    type: EventType = Field(..., description="The type of the event", example=EventType.academic)
    registration_link: str | None = Field(
        default=None,
        description="The registration link for the event",
        example="https://forms.google.com/event-registration",
    )

    @field_validator("start_datetime", "end_datetime")
    @classmethod
    def validate_datetime(cls, value: datetime | None) -> datetime | None:
        return almaty_to_utc(value) if value is not None else None

    @field_validator("end_datetime")
    @classmethod
    def validate_end_datetime(cls, value: datetime, info):
        start_dt = info.data.get("start_datetime")
        if value is not None and start_dt is not None and value <= start_dt:
            raise ValueError("End datetime must be after start datetime")
        return value


class EnrichedEventCreateRequest(EventCreateRequest):
    """Internal model with system-controlled fields set by the backend."""

    tag: EventTag = Field(..., description="The tag of the event", example=EventTag.regular)
    status: EventStatus = Field(
        ..., description="The status of the event", example=EventStatus.approved
    )


class EventUpdateRequest(BaseModel):
    name: str | None = Field(
        default=None, description="The name of the event", example="nuspace 2025"
    )
    place: str | None = Field(
        default=None, description="The place of the event", example="NU 3rd block, 3rd floor"
    )
    start_datetime: datetime | None = Field(
        default=None,
        description="Event start as UTC instant (ISO-8601 with offset). Naive values are Asia/Almaty.",
        example="2026-06-12T10:00:00+05:00",
    )
    end_datetime: datetime | None = Field(
        default=None,
        description="Event end as UTC instant (ISO-8601 with offset). Naive values are Asia/Almaty.",
        example="2026-06-12T12:00:00+05:00",
    )
    description: str | None = Field(
        default=None,
        description="The description of the event",
        example="nuspace is a community event",
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

    tag: EventTag | None = Field(
        default=None, description="The tag of the event. Admin only", example=None
    )

    media_ids_to_delete: list[int] | None = Field(
        default=None,
        description="IDs of media attachments to delete as part of this update",
    )

    @field_validator("start_datetime", "end_datetime")
    @classmethod
    def validate_datetime(cls, value: datetime | None) -> datetime | None:
        return almaty_to_utc(value) if value is not None else None

    @field_validator("end_datetime")
    @classmethod
    def validate_end_datetime(cls, value: datetime | None, info):
        start_dt = info.data.get("start_datetime")
        if value is not None and start_dt is not None and value <= start_dt:
            raise ValueError("End datetime must be after start datetime")
        return value

    @field_validator("name", "place", "description")
    def validate_string_fields(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            value = value.strip()
            if not value:
                return None
        return value


class BaseEventSchema(BaseModel):
    id: int
    creator_sub: str
    policy: RegistrationPolicy
    registration_link: Optional[str] = None
    name: str
    place: str
    start_datetime: datetime
    end_datetime: datetime
    description: str
    type: EventType
    status: EventStatus
    tag: EventTag
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EventResponse(BaseEventSchema):
    media: List[MediaResponse] = Field(default_factory=list)
    creator: ShortUserResponse
    permissions: ResourcePermissions = Field(default_factory=ResourcePermissions)
    attendees_count: int = Field(default=0, ge=0)
    is_going: bool = False

    class Config:
        from_attributes = True


class EventGoingResponse(BaseModel):
    attendees_count: int = Field(..., ge=0)
    is_going: bool


class EventAttendeeResponse(BaseModel):
    sub: str
    name: str
    surname: str
    picture: str
    email: str
    going_at: datetime

    class Config:
        from_attributes = True


class ListEventAttendeesResponse(BaseModel):
    items: List[EventAttendeeResponse] = Field(default_factory=list)
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    size: int = Field(..., ge=1)
    has_next: bool


class EventAttendeesExportFormat(str, Enum):
    csv = "csv"
    xlsx = "xlsx"


class EventAccessInviteCreateRequest(BaseModel):
    purpose: EventAccessPurpose = Field(
        ...,
        description="transfer = one-time ownership claim; co_view = share attendee list access",
    )


class EventAccessInviteCreatedResponse(BaseModel):
    id: int
    purpose: EventAccessPurpose
    token: str
    url_path: str
    expires_at: datetime


class EventAccessInviteResponse(BaseModel):
    id: int
    purpose: EventAccessPurpose
    created_by_sub: str
    expires_at: datetime
    revoked_at: datetime | None = None
    accepted_at: datetime | None = None
    accepted_by_sub: str | None = None
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class ListEventAccessInvitesResponse(BaseModel):
    items: List[EventAccessInviteResponse] = Field(default_factory=list)


class EventAccessInviteAcceptRequest(BaseModel):
    token: str = Field(..., min_length=16)


class EventAccessInviteAcceptResponse(BaseModel):
    event_id: int
    purpose: EventAccessPurpose
    action: str


class EventFilter(BaseModel):
    """Filter model for event queries with pagination and filtering options."""

    size: int = Field(default=20, ge=1, le=100, description="Number of events per page")
    page: int = Field(default=1, ge=1, description="Page number")
    registration_policy: Optional[RegistrationPolicy] = Field(
        default=None, description="Filter by event registration policy"
    )
    event_type: Optional[EventType] = Field(default=None, description="Filter by event type")
    event_status: Optional[EventStatus] = Field(default=None, description="Filter by event status")
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
    sort_by_display_datetime: bool = Field(
        default=False,
        description="Sort recruitment by deadline and other events by start time",
    )


class ListEventResponse(BaseModel):
    items: List[EventResponse] = Field(default_factory=list)
    total_pages: int = Field(default=1, ge=1)
    total: int
    page: int
    size: int
    has_next: bool
