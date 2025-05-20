from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, field_validator

from backend.core.database.models.review import OwnerType, ReviewableType
from backend.routes.google_bucket.schemas import MediaResponse


class ReviewRequestSchema(BaseModel):
    reviewable_type: ReviewableType
    entity_id: int
    user_sub: str
    rating: int
    content: str
    owner_type: OwnerType
    owner_id: str | int

    @field_validator("rating")
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v

    @field_validator("content")
    def validate_content(cls, v):
        if 40 < len(v) > 200:
            raise ValueError("Content must be between 40 and 200 characters")
        return v

    @field_validator("owner_id")
    def validate_owner_id(cls, v):
        try:
            return int(v)
        except ValueError:
            return v


class ReviewUpdateSchema(BaseModel):
    rating: int
    content: str

    @field_validator("rating")
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v

    @field_validator("content")
    def validate_content(cls, v):
        if 40 < len(v) > 200:
            raise ValueError("Content must be between 40 and 200 characters")
        return v


class ReviewResponseSchema(BaseModel):
    id: int
    reviewable_type: ReviewableType
    entity_id: int
    user_sub: str
    rating: int
    content: str
    owner_type: OwnerType
    owner_id: str
    created_at: datetime
    updated_at: datetime
    media: List[MediaResponse] = []

    model_config = ConfigDict(from_attributes=True)
