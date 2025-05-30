from datetime import date, datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel, field_validator

from backend.common.schemas import MediaResponse, ShortUserResponse
from backend.core.database.models.community import (
    CommunityCategory,
    CommunityRecruitmentStatus,
    CommunityType,
)


class CommunityRequest(BaseModel):
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


class ShortCommunityResponse(BaseModel):
    id: int
    name: str
    description: str
    media: List[MediaResponse] = []

    class Config:
        from_attributes = True


class CommunityUpdate(BaseModel):
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


class ListCommunity(BaseModel):
    communities: List[BaseCommunity] = []
    total_pages: int = Query(1, ge=1)
