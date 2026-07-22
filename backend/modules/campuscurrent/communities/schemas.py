import re
from datetime import date, datetime
from typing import List, Literal
from urllib.parse import SplitResult, urlsplit

from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_serializer, field_validator

from backend.common.schemas import ResourcePermissions, ShortUserResponse
from backend.modules.campuscurrent.models.community import (
    CommunityCategory,
    CommunityRecruitmentStatus,
    CommunityType,
)
from backend.modules.media.schemas import MediaResponse


_URL_SCHEME_PATTERN = re.compile(r"^[a-z][a-z\d+.-]*:", re.IGNORECASE)
_SOCIAL_HOSTS = {
    "telegram": {"t.me", "telegram.me"},
    "instagram": {"instagram.com", "instagr.am"},
}


def _normalize_optional_url(value: object) -> str | None:
    if value is None:
        return None

    normalized = str(value).strip()
    if not normalized:
        return None
    if not _URL_SCHEME_PATTERN.match(normalized):
        return f"https://{normalized}"
    return normalized


def _parse_http_url(value: str, error_message: str) -> SplitResult:
    if value.count("://") != 1:
        raise ValueError(error_message)

    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        _ = parsed.port
    except ValueError:
        raise ValueError(error_message) from None

    if parsed.scheme not in {"http", "https"} or not hostname:
        raise ValueError(error_message)
    return parsed


def _validate_social_url(
    value: object,
    *,
    platform: Literal["telegram", "instagram"],
    error_message: str,
) -> str | None:
    normalized = _normalize_optional_url(value)
    if normalized is None:
        return None

    parsed = _parse_http_url(normalized, error_message)
    hostname = parsed.hostname.lower().removeprefix("www.")
    if hostname not in _SOCIAL_HOSTS[platform]:
        raise ValueError(error_message)
    return normalized


def _validate_recruitment_url(value: object) -> str | None:
    error_message = "Enter an HTTPS URL"
    normalized = _normalize_optional_url(value)
    if normalized is None:
        return None

    parsed = _parse_http_url(normalized, error_message)
    if parsed.scheme != "https":
        raise ValueError(error_message)
    return normalized


class CommunityCreateRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="The name of the community",
        example="NU Fencing Club",
    )
    type: CommunityType = Field(
        ..., description="The type of the community", example=CommunityType.club
    )
    category: CommunityCategory = Field(
        ..., description="The category of the community", example=CommunityCategory.academic
    )
    email: EmailStr | None = Field(
        default=None,
        description="The email of the community",
        example="nufencingclub@gmail.com",
    )
    recruitment_status: CommunityRecruitmentStatus = Field(
        ...,
        description="The recruitment status of the community",
        example=CommunityRecruitmentStatus.open,
    )
    recruitment_link: HttpUrl | None = Field(
        default=None,
        description="The link to the recruitment page",
        example="https://www.google.com",
    )
    description: str = Field(
        ...,
        max_length=5000,
        description="The description of the community",
        example="We are a club that does fencing",
    )
    established: date = Field(
        ..., description="The date the community was established", example=date(2025, 1, 1)
    )
    head: str = Field(..., description="The head of the community (user_sub)")
    telegram_url: str | None = Field(
        default=None,
        description="The Telegram URL of the community",
        example="https://t.me/nufencingclub",
    )
    instagram_url: str | None = Field(
        default=None,
        description="The Instagram URL of the community",
        example="https://www.instagram.com/nufencingclub",
    )

    @field_validator("telegram_url", mode="before")
    @classmethod
    def validate_telegram_url(cls, value: object) -> str | None:
        return _validate_social_url(
            value,
            platform="telegram",
            error_message="Enter a Telegram URL",
        )

    @field_validator("instagram_url", mode="before")
    @classmethod
    def validate_instagram_url(cls, value: object) -> str | None:
        return _validate_social_url(
            value,
            platform="instagram",
            error_message="Enter an Instagram URL",
        )

    @field_validator("recruitment_link", mode="before")
    @classmethod
    def validate_recruitment_link(cls, value: object) -> str | None:
        return _validate_recruitment_url(value)

    @field_serializer("recruitment_link")
    def serialize_recruitment_link(self, value: HttpUrl | None) -> str | None:
        return str(value) if value else None


class BaseCommunity(BaseModel):
    id: int
    name: str
    type: CommunityType
    category: CommunityCategory
    email: EmailStr | None = None
    recruitment_status: CommunityRecruitmentStatus
    verified: bool
    recruitment_link: HttpUrl | None = None
    description: str
    established: date
    head: str
    telegram_url: str | None = None
    instagram_url: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommunityResponse(BaseCommunity):
    head_user: ShortUserResponse
    media: List[MediaResponse] = []
    permissions: ResourcePermissions = ResourcePermissions()


class ShortCommunityResponse(BaseModel):
    id: int
    name: str
    description: str
    verified: bool = False
    media: List[MediaResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CommunityUpdateRequest(BaseModel):
    name: str | None = Field(
        default=None, description="The name of the community", example="NU Fencing Club"
    )
    email: EmailStr | None = Field(
        default=None,
        description="The email of the community",
        example="nufencingclub@gmail.com",
    )
    established: date | None = Field(
        default=None, description="The date the community was established", example="2025-01-01"
    )
    recruitment_status: CommunityRecruitmentStatus | None = Field(
        default=None,
        description="The recruitment status of the community",
        example=CommunityRecruitmentStatus.open,
    )
    recruitment_link: HttpUrl | None = Field(
        default=None,
        description="The link to the recruitment page",
        example="https://www.nuspace.kz/recruitment",
    )
    description: str | None = Field(
        default=None,
        max_length=5000,
        description="The description of the community",
        example="We are a club that does fencing",
    )
    telegram_url: str | None = Field(
        default=None,
        description="The Telegram URL of the community",
        example="https://t.me/nufencingclub",
    )
    instagram_url: str | None = Field(
        default=None,
        description="The Instagram URL of the community",
        example="https://www.instagram.com/nufencingclub",
    )

    media_ids_to_delete: list[int] | None = Field(
        default=None,
        description="IDs of media attachments to delete as part of this update",
    )

    @field_validator("name", "description", "telegram_url", "instagram_url")
    def validate_emptiness(cls, value):
        if not value or value.strip() == "":
            return None
        return value

    @field_serializer("recruitment_link")
    def serialize_recruitment_link(self, value: HttpUrl | None) -> str | None:
        return str(value) if value else None

    class Config:
        from_attributes = True

    @field_validator("telegram_url", mode="before")
    @classmethod
    def validate_telegram_url(cls, value: object) -> str | None:
        return _validate_social_url(
            value,
            platform="telegram",
            error_message="Enter a Telegram URL",
        )

    @field_validator("instagram_url", mode="before")
    @classmethod
    def validate_instagram_url(cls, value: object) -> str | None:
        return _validate_social_url(
            value,
            platform="instagram",
            error_message="Enter an Instagram URL",
        )

    @field_validator("recruitment_link", mode="before")
    @classmethod
    def validate_recruitment_link(cls, value: object) -> str | None:
        return _validate_recruitment_url(value)


class ListCommunity(BaseModel):
    items: List[CommunityResponse] = Field(default_factory=list)
    total_pages: int = Field(default=1, ge=1)
    total: int
    page: int
    size: int
    has_next: bool
