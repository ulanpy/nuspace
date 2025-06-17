from datetime import date, datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel, Field, field_validator

from backend.common.schemas import MediaResponse, ResourcePermissions, ShortUserResponse
from backend.core.database.models.community import (
    CommunityCategory,
    CommunityRecruitmentStatus,
    CommunityType,
)


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
    recruitment_status: CommunityRecruitmentStatus = Field(
        ...,
        description="The recruitment status of the community",
        example=CommunityRecruitmentStatus.open,
    )
    description: str = Field(
        ...,
        max_length=1000,
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

    @field_validator("telegram_url", "instagram_url")
    def validate_url(cls, value):
        if not value.startswith(("http://", "https://")):
            raise ValueError("Invalid URL format")
        return value


class BaseCommunity(BaseModel):
    id: int
    name: str
    type: CommunityType
    category: CommunityCategory
    recruitment_status: CommunityRecruitmentStatus
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
    media: List[MediaResponse] = []

    class Config:
        from_attributes = True


class CommunityUpdateRequest(BaseModel):
    name: str | None = Field(
        default=None, description="The name of the community", example="NU Fencing Club"
    )
    recruitment_status: CommunityRecruitmentStatus | None = Field(
        default=None,
        description="The recruitment status of the community",
        example=CommunityRecruitmentStatus.open,
    )
    description: str | None = Field(
        default=None,
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

    class Config:
        from_attributes = True  # Make sure it can be used with SQLAlchemy models


class ListCommunity(BaseModel):
    communities: List[CommunityResponse] = []
    total_pages: int = Query(1, ge=1)
