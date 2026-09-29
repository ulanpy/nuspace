from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field, field_validator

from backend.common.schemas import ResourcePermissions, ShortUserResponse
from backend.modules.media.schemas import MediaResponse
from backend.modules.pages.models.page import PageVisibility
from backend.modules.shared.slug import validate_slug


class PageCreateRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="The name of the page",
        example="NU Fencing Club",
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="A short summary of what the page is for",
        example="Weekly beginner-friendly fencing sessions.",
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
        description="Free-form page content",
        example={},
    )
    visibility: PageVisibility = Field(
        default=PageVisibility.public,
        description="Who may see this page",
        example=PageVisibility.public,
    )
    owner: str = Field(default="me", description="The owner of the page (user_sub, or 'me')")

    @field_validator("slug", mode="before")
    @classmethod
    def validate_slug(cls, value: object) -> str:
        if isinstance(value, str):
            return validate_slug(value)
        return validate_slug(str(value))


class BasePage(BaseModel):
    id: int
    name: str
    description: str | None = None
    visibility: PageVisibility
    slug: str
    page_content: dict
    owner: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PageResponse(BasePage):
    # None on a page with no owner: the FK is ON DELETE SET NULL, and the
    # relationship is simply absent. A required field here crashes the read.
    owner_user: ShortUserResponse | None = None
    media: List[MediaResponse] = []
    permissions: ResourcePermissions = ResourcePermissions()


class AdminResponse(BaseModel):
    sub: str
    name: str
    surname: str
    picture: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminLinkResponse(BaseModel):
    url: str


class AdminLinkAcceptRequest(BaseModel):
    token: str


class AdminLinkAcceptResponse(BaseModel):
    status: Literal["granted", "already_admin", "already_owner"]


class ShortPageResponse(BaseModel):
    id: int
    name: str
    media: List[MediaResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class PageUpdateRequest(BaseModel):
    name: str | None = Field(
        default=None, description="The name of the page", example="NU Fencing Club"
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="A short summary of what the page is for",
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
        description="Free-form page content",
    )
    visibility: PageVisibility | None = Field(
        default=None,
        description="Who may see this page",
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


class PageOwnerUpdateRequest(BaseModel):
    owner_sub: str = Field(..., description="Sub of the new owner user")


class ListPage(BaseModel):
    items: List[PageResponse] = Field(default_factory=list)
    total_pages: int = Field(default=1, ge=1)
    total: int
    page: int
    size: int
    has_next: bool


class ListPageAdmins(BaseModel):
    items: List[AdminResponse] = Field(default_factory=list)
    total_pages: int = Field(default=1, ge=1)
    total: int
    page: int
    size: int
    has_next: bool
