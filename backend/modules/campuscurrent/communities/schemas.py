from datetime import datetime
from typing import List

from pydantic import BaseModel, EmailStr, Field, field_validator

from backend.common.schemas import ResourcePermissions, ShortUserResponse
from backend.modules.campuscurrent.models.community import (
    CommunityCategory,
    CommunityType,
)
from backend.modules.media.schemas import MediaResponse
from backend.modules.shared.slug import validate_slug


class CommunityCreateRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="The name of the community",
        example="NU Fencing Club",
    )
    type: CommunityType = Field(
        ..., description="The type of the community", example=CommunityType.club
    )
    category: CommunityCategory = Field(
        ..., description="The category of the community", example=CommunityCategory.academic
    )
    email: EmailStr | None = Field(
        default=None,
        description="The email of the community",
        example="nufencingclub@gmail.com",
    )
    slug: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="URL-friendly unique identifier",
        example="nu-fencing-club",
    )
    page_content: dict = Field(
        default_factory=dict,
        description="Free-form page content of the community",
        example={},
    )
    owner: str = Field(..., description="The owner of the community (user_sub)")

    @field_validator("slug", mode="before")
    @classmethod
    def validate_slug(cls, value: object) -> str:
        if isinstance(value, str):
            return validate_slug(value)
        return validate_slug(str(value))


class BaseCommunity(BaseModel):
    id: int
    name: str
    type: CommunityType
    category: CommunityCategory
    email: EmailStr | None = None
    verified: bool
    slug: str
    page_content: dict
    owner: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommunityResponse(BaseCommunity):
    owner_user: ShortUserResponse
    media: List[MediaResponse] = []
    permissions: ResourcePermissions = ResourcePermissions()


class ShortCommunityResponse(BaseModel):
    id: int
    name: str
    verified: bool = False
    media: List[MediaResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CommunityUpdateRequest(BaseModel):
    name: str | None = Field(
        default=None, description="The name of the community", example="NU Fencing Club"
    )
    email: EmailStr | None = Field(
        default=None,
        description="The email of the community",
        example="nufencingclub@gmail.com",
    )
    slug: str | None = Field(
        default=None,
        min_length=3,
        max_length=50,
        description="URL-friendly unique identifier",
        example="nu-fencing-club",
    )
    page_content: dict | None = Field(
        default=None,
        description="Free-form page content of the community",
    )

    media_ids_to_delete: list[int] | None = Field(
        default=None,
        description="IDs of media attachments to delete as part of this update",
    )

    @field_validator("slug", mode="before")
    @classmethod
    def validate_slug(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str):
            return validate_slug(value)
        return validate_slug(str(value))

    @field_validator("name")
    def validate_emptiness(cls, value):
        if not value or value.strip() == "":
            return None
        return value

    class Config:
        from_attributes = True


class ListCommunity(BaseModel):
    items: List[CommunityResponse] = Field(default_factory=list)
    total_pages: int = Field(default=1, ge=1)
    total: int
    page: int
    size: int
    has_next: bool
