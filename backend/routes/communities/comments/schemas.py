from datetime import datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel, field_validator

from backend.common.schemas import MediaResponse


class RequestCommunityCommentSchema(BaseModel):
    post_id: int
    parent_id: int | None = None
    user_sub: str
    content: str = Query(max_length=300)

    @field_validator("parent_id")
    def validate_parent_id(cls, value):
        if value == 0:
            return None
        return value


class BaseCommunityCommentSchema(BaseModel):
    id: int
    post_id: int
    parent_id: int | None = None
    user_sub: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResponseCommunityCommentSchema(BaseCommunityCommentSchema):
    total_replies: int | None = Query(default=None, ge=0)
    media: List[MediaResponse] = []


class ListCommunityCommentResponseSchema(BaseModel):
    comments: List[ResponseCommunityCommentSchema] = []
    total_pages: int = Query(default=1, ge=1)
