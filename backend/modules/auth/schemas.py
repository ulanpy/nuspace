from typing import Any, Dict, List

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from backend.modules.auth.models import UserRole, UserScope
from backend.modules.media.schemas import MediaResponse
from backend.modules.shared.slug import validate_slug


class UserSchema(BaseModel):
    email: EmailStr
    role: UserRole
    scope: UserScope
    name: str
    surname: str
    picture: str
    sub: str
    slug: str | None = None
    page_content: Dict[str, Any] = {}
    is_page_public: bool = False


class Sub(BaseModel):
    sub: str


class CurrentUserResponse(BaseModel):
    user: Dict[str, Any]  # This will store user token data
    tg_id: int | None = None  # Indicates if user exists in the database


class UserScopeUpdateRequest(BaseModel):
    scope: UserScope = Field(..., description="New scope: 'allowed' or 'banned'")


class UserScopeResponse(BaseModel):
    sub: str
    scope: UserScope


class UserSummaryResponse(BaseModel):
    """One row of the public profile directory. Carries no page content."""

    sub: str
    name: str
    surname: str
    slug: str
    picture: str | None = None
    # Whether there is anything to copy. A boolean rather than the content
    # itself: the template dialog has to grey out a row with no design, and
    # shipping every row's whole page blob to do that is not a trade worth
    # making for a list of twenty names.
    has_design: bool = False

    model_config = ConfigDict(from_attributes=True)


class UserPageResponse(BaseModel):
    sub: str
    name: str
    surname: str
    slug: str
    picture: str | None = None
    page_content: Dict[str, Any] = Field(default_factory=dict)
    # Plain default, not default_factory: this is what CommunityResponse does,
    # and the generated client type comes out `media: Media[]` rather than
    # `media?: Media[]`, which is what the pickers and the upload refresh need.
    media: List[MediaResponse] = []

    model_config = ConfigDict(from_attributes=True)


class UserPageList(BaseModel):
    items: List[UserSummaryResponse] = Field(default_factory=list)
    total_pages: int = Field(default=1, ge=1)
    total: int
    page: int
    size: int
    has_next: bool


class UserPageUpdateRequest(BaseModel):
    # extra="forbid" so a caller that sends a `sub` is told so, rather than
    # having it silently dropped: this route can only ever write the session's
    # own account, and quietly ignoring a field the caller thinks was applied
    # is how data bugs start.
    model_config = ConfigDict(extra="forbid")

    slug: str | None = Field(default=None, min_length=3, max_length=50)
    page_content: Dict[str, Any] | None = None
    is_page_public: bool | None = None
    media_ids_to_delete: List[int] = Field(default_factory=list)

    @field_validator("slug", mode="before")
    @classmethod
    def validate_slug(cls, value: object) -> str:
        if value is None:
            raise ValueError("A slug is required")
        return validate_slug(value if isinstance(value, str) else str(value))
