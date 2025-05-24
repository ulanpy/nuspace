from datetime import datetime
from typing import List

from pydantic import BaseModel, field_validator

from backend.common.schemas import MediaResponse


class CommunityCommentRequestSchema(BaseModel):
    post_id: int
    parent_id: int | None = None
    user_sub: str
    content: str

    @field_validator("parent_id")
    def validate_parent_id(cls, value):
        if value == 0:
            return None
        return value


class CommunityCommentSchema(BaseModel):
    id: int
    post_id: int
    parent_id: int | None = None
    user_sub: str
    content: str
    created_at: datetime
    updated_at: datetime
    media: List[MediaResponse] = []


class CommunityCommentResponseSchema(CommunityCommentSchema):
    total_replies: int | None = None

    @field_validator("total_replies")
    def validate_replies(cls, value):
        if value <= 0:
            raise ValueError("Number of replies should be positive")
        return value


class ListCommunityCommentResponseSchema(BaseModel):
    comments: List[CommunityCommentResponseSchema] = []
    num_of_pages: int

    @field_validator("num_of_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
