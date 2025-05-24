from datetime import datetime
from typing import List

from pydantic import BaseModel, field_validator


class CommunityPostRequestSchema(BaseModel):
    community_id: int
    user_sub: str
    title: str
    description: str
    tag_id: int  # FK to CommunityTag


class CommunityPostResponseSchema(BaseModel):
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


class ListCommunityPostResponseSchema(BaseModel):
    posts: List[CommunityPostResponseSchema] = []
    num_of_pages: int

    @field_validator("num_of_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
