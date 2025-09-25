from datetime import datetime
from typing import List

from backend.common.schemas import MediaResponse
from backend.core.database.models.review import OwnerType, ReviewableType
from backend.modules.review import service
from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from sqlalchemy.orm import DeclarativeBase


class ReviewReplyRequestSchema(BaseModel):
    review_id: int
    user_sub: str
    content: str

    @field_validator("content")
    def validate_content(cls, v):
        if len(v) > 200:
            raise ValueError("Content must be smaller than 200 characters")
        return v


class ReviewReplyResponseSchema(BaseModel):
    id: int
    review_id: int
    user_sub: str
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewRequestSchema(BaseModel):
    reviewable_type: ReviewableType
    entity_id: int
    user_sub: str
    rating: int
    content: str | None = None
    owner_type: OwnerType
    owner_id: str | int

    @field_validator("rating")
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v

    @field_validator("content")
    def validate_content(cls, v):
        if len(v) > 200:
            raise ValueError("Content must be smaller than 200 characters")
        return v

    @field_validator("owner_id")
    def validate_owner_id(cls, v):
        try:
            return int(v)
        except ValueError:
            return v

    @model_validator(mode="after")
    def validate_owner_type(self):
        model: DeclarativeBase = service.REVIEWABLE_TYPE_MODEL_MAP.get(self.reviewable_type)
        parent_model: DeclarativeBase = service.SECOND_REVIEWABLE_TYPE_PARENT_MODEL_MAP.get(model)
        if parent_model != service.REVIEWABLE_TYPE_PARENT_MODEL_MAP.get(self.owner_type):
            raise ValueError("Invalid owner type")
        return self


class ReviewUpdateSchema(BaseModel):
    rating: int | None = None
    content: str | None = None

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
    content: str | None = None
    owner_type: OwnerType
    owner_id: str
    created_at: datetime
    updated_at: datetime
    media: List[MediaResponse] = []
    reply: ReviewReplyResponseSchema | None = None

    model_config = ConfigDict(from_attributes=True)


class ListReviewResponseSchema(BaseModel):
    reviews: List[ReviewResponseSchema]
    total_pages: int

    @field_validator("total_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
