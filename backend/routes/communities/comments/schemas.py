from datetime import datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel, field_validator

from backend.common.schemas import MediaResponse, ResourcePermissions, ShortUserResponse


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
    user_sub: str | None
    content: str | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True


class ResponseCommunityCommentSchema(BaseCommunityCommentSchema):
    total_replies: int = Query(default=0, ge=0)
    media: List[MediaResponse] = []
    user: ShortUserResponse | None = None
    permissions: ResourcePermissions = ResourcePermissions()


class ListCommunityCommentResponseSchema(BaseModel):
    comments: List[ResponseCommunityCommentSchema] = []
    total_pages: int = Query(default=1, ge=1)


class UpdateCommunityCommentSchema(BaseModel):
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True
