from datetime import datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel

from backend.common.schemas import MediaResponse, ShortUserResponse
from backend.routes.communities.tags.schemas import ShortCommunityTag
from backend.common.schemas import ResourcePermissions


class CommunityPostRequest(BaseModel):
    community_id: int
    user_sub: str
    title: str
    description: str
    tag_id: int | None = None
    from_community: bool | None = None


class PostTagResponse(BaseModel):
    id: int
    name: str


class BaseCommunityPost(BaseModel):
    id: int
    community_id: int
    user_sub: str
    title: str
    description: str
    tag_id: int | None = None
    created_at: datetime
    updated_at: datetime
    from_community: bool

    class Config:
        from_attributes = True


class CommunityPostResponse(BaseCommunityPost):
    media: List[MediaResponse] = []
    user: ShortUserResponse
    total_comments: int = Query(default=0, ge=0)
    tag: ShortCommunityTag | None = None
    permissions: ResourcePermissions = ResourcePermissions()

class ListCommunityPostResponse(BaseModel):
    posts: List[CommunityPostResponse] = []
    total_pages: int = Query(1, ge=1)


class CommunityPostUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    tag_id: int | None = None

    class Config:
        from_attributes = True
