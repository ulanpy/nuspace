from datetime import date, datetime, timezone
from typing import List

from pydantic import BaseModel, field_validator

from backend.common.schemas import MediaResponse
from backend.core.database.models.community import (
    CommunityCategory,
    CommunityRecruitmentStatus,
    CommunityType,
    EventStatus,
    EventTag,
    RegistrationPolicy,
)


class CommunityRequestSchema(BaseModel):
    name: str
    type: CommunityType
    category: CommunityCategory
    recruitment_status: CommunityRecruitmentStatus
    description: str
    established: date
    head: str
    telegram_url: str | None = None
    instagram_url: str | None = None

    @field_validator("telegram_url", "instagram_url")
    def validate_url(cls, value):
        if not value.startswith(("http://", "https://")):
            raise ValueError("Invalid URL format")
        return value


class CommunityResponseSchema(BaseModel):
    id: int
    name: str
    type: CommunityType
    category: CommunityCategory
    recruitment_status: CommunityRecruitmentStatus
    description: str
    established: date
    user_name: str
    user_surname: str
    telegram_url: str
    instagram_url: str
    created_at: datetime
    updated_at: datetime
    media: List[MediaResponse] = []


class CommunityUpdateSchema(BaseModel):
    community_id: int
    name: str | None = None
    recruitment_status: CommunityRecruitmentStatus | None = None
    description: str | None = None
    telegram_url: str | None = None
    instagram_url: str | None = None

    @field_validator("name", "description", "telegram_url", "instagram_url")
    def validate_emptiness(cls, value):
        if not value or value.strip() == "":
            return None
        return value

    class Config:
        from_attributes = True  # Make sure it can be used with SQLAlchemy models


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


class ListCommunitySchema(BaseModel):
    communities: List[CommunityResponseSchema] = []
    num_of_pages: int

    @field_validator("num_of_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value


class CommunityCommentRequestSchema(BaseModel):
    post_id: int
    parent_id: int | None = None
    user_sub: str
    content: str


class CommunityCommentSchema(BaseModel):
    id: int
    post_id: int
    parent_id: int | None = None
    user_sub: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommunityCommentResponseSchema(CommunityCommentSchema):
    total_replies: int


class ListCommunityCommentResponseSchema(BaseModel):
    comments: List[CommunityCommentResponseSchema] = []
    num_of_pages: int

    @field_validator("num_of_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
