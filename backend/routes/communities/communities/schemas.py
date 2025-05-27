from datetime import date, datetime
from typing import List

from pydantic import BaseModel, field_validator

from backend.common.schemas import MediaResponse
from backend.core.database.models.community import (
    CommunityCategory,
    CommunityRecruitmentStatus,
    CommunityType,
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
    user_picture: str
    telegram_url: str
    instagram_url: str
    created_at: datetime
    updated_at: datetime
    media: List[MediaResponse] = []


class ShortCommunityResponseSchema(BaseModel):
    id: int
    name: str
    description: str
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


class ListCommunitySchema(BaseModel):
    communities: List[CommunityResponseSchema] = []
    num_of_pages: int

    @field_validator("num_of_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
