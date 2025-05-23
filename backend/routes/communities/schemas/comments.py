from datetime import datetime
from typing import List

from pydantic import BaseModel, field_validator


class CommunityCommentRequestSchema(BaseModel):
    post_id: int
    parent_id: int | None = None
    user_sub: str
    content: str


class CommunityCommentSchema(BaseModel):
    id: int
    post_id: int
    parent_id: int | None = None
    user_sub: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommunityCommentResponseSchema(CommunityCommentSchema):
    total_replies: int


class ListCommunityCommentResponseSchema(BaseModel):
    comments: List[CommunityCommentResponseSchema] = []
    num_of_pages: int

    @field_validator("num_of_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
