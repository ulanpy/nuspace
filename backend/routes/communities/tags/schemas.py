from datetime import datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel, field_validator


class CommunityTagRequest(BaseModel):
    community_id: int
    name: str

    @field_validator("name")
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Tag name cannot be empty")
        if len(value) > 50:  # Reasonable limit for tag names
            raise ValueError("Tag name cannot be longer than 50 characters")
        return value


class BaseCommunityTag(BaseModel):
    id: int
    community_id: int
    name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommunityTagResponse(BaseCommunityTag):
    pass


class ShortCommunityTag(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class ListCommunityTagResponse(BaseModel):
    tags: List[ShortCommunityTag] = []
    total_pages: int = Query(1, ge=1)
