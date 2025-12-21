from datetime import date, datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_serializer, field_validator

from backend.common.schemas import MediaResponse, ResourcePermissions, ShortUserResponse
from backend.core.database.models.community import (
    CommunityCategory,
    CommunityRecruitmentStatus,
    CommunityType,
)


# Achievement Schemas
class AchievementBase(BaseModel):
    description: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Short description of the achievement",
        example="Revived tradition 'Miriater' allowing both new and older members to perform",
    )
    year: int = Field(
        ...,
        ge=1900,
        le=2100,
        description="Year the achievement was accomplished",
        example=2024,
    )

    class Config:
        from_attributes = True


class AchievementCreateRequest(AchievementBase):
    community_id: int = Field(..., description="ID of the community this achievement belongs to")


class AchievementUpdateRequest(BaseModel):
    description: str | None = Field(
        default=None,
        min_length=1,
        max_length=500,
        description="Short description of the achievement",
    )
    year: int | None = Field(
        default=None,
        ge=1900,
        le=2100,
        description="Year the achievement was accomplished",
    )

    class Config:
        from_attributes = True


class AchievementResponse(AchievementBase):
    id: int
    community_id: int
    created_at: datetime
    updated_at: datetime


class ListAchievements(BaseModel):
    achievements: List[AchievementResponse] = []
    total_pages: int = 1


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

    @field_validator("telegram_url", "instagram_url", mode="before")
    def normalize_social_url(cls, value):
        if value is None:
            return None
        value = value.strip()
        if value == "":
            return None
        if not value.startswith(("http://", "https://")):
            return f"https://{value}"
        return value

    @field_validator("recruitment_link", mode="before")
    def normalize_recruitment_link(cls, value):
        if value is None:
            return None
        value = str(value).strip()
        if value == "":
            return None
        if not value.startswith(("http://", "https://")):
            return f"https://{value}"
        return value

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
    achievements: List[AchievementResponse] = []


class ShortCommunityResponse(BaseModel):
    id: int
    name: str
    description: str
    media: List[MediaResponse] = []

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

    @field_validator("name", "description", "telegram_url", "instagram_url")
    def validate_emptiness(cls, value):
        if not value or value.strip() == "":
            return None
        return value

    @field_serializer("recruitment_link")
    def serialize_recruitment_link(self, value: HttpUrl | None) -> str | None:
        return str(value) if value else None

    class Config:
        from_attributes = True  # Make sure it can be used with SQLAlchemy models

    @field_validator("telegram_url", "instagram_url", mode="before")
    def normalize_social_url_update(cls, value):
        if value is None:
            return None
        value = value.strip()
        if value == "":
            return None
        if not value.startswith(("http://", "https://")):
            return f"https://{value}"
        return value

    @field_validator("recruitment_link", mode="before")
    def normalize_recruitment_link_update(cls, value):
        if value is None:
            return None
        value = str(value).strip()
        if value == "":
            return None
        if not value.startswith(("http://", "https://")):
            return f"https://{value}"
        return value


class ListCommunity(BaseModel):
    communities: List[CommunityResponse] = []
    total_pages: int = Query(1, ge=1)
