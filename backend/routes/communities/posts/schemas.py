from datetime import datetime
from typing import List

from pydantic import BaseModel, field_validator

from backend.common.schemas import MediaResponse, ShortUserResponse


class CommunityPostRequestSchema(BaseModel):
    community_id: int
    user_sub: str
    title: str
    description: str
    tag_id: int  # FK to CommunityTag


class PostTagResponse(BaseModel):
    id: int
    name: str


class BaseCommunityPostSchema(BaseModel):
    id: int
    community_id: int
    user_sub: str
    title: str
    description: str
    tag_id: int
    created_at: datetime
    updated_at: datetime
    from_community: bool

    class Config:
        from_attributes = True


class CommunityPostResponse(BaseCommunityPostSchema):
    media: List[MediaResponse] = []
    user: ShortUserResponse


class ListCommunityPostResponseSchema(BaseModel):
    posts: List[CommunityPostResponse] = []
    total_pages: int

    @field_validator("total_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
