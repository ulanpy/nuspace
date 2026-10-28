from typing import Literal

from pydantic import BaseModel, Field, field_validator

from backend.modules.pages.models.page import PageVisibility
from backend.modules.profiles.handle import validate_handle


class ProfileSettingsResponse(BaseModel):
    """The viewer's own profile: its address, its tier, and what they wrote.

    `content` is null until the first save, which is how the editor knows to
    open on the About and Links template rather than on a blank canvas.
    """

    handle: str | None
    visibility: PageVisibility
    content: dict | None


class ProfileSettingsUpdate(BaseModel):
    """Either field may be left out. `handle: null` takes the profile page down."""

    handle: str | None = Field(
        default=None,
        description="The address at my.nuspace.kz/u/<handle>",
        examples=["aigerim-b"],
    )
    visibility: PageVisibility | None = Field(default=None, description="Who may read the profile")

    @field_validator("handle")
    @classmethod
    def _valid_handle(cls, value: str | None) -> str | None:
        return None if value is None else validate_handle(value)


class ProfileContentUpdate(BaseModel):
    content: dict = Field(..., description="The Puck document the person wrote")


class ProfileResponse(BaseModel):
    """A profile page as a reader sees it.

    Everything but `content` is the identity header, read from `users` on every
    request, so it is never stale and the person cannot delete it by editing.
    """

    handle: str
    name: str
    surname: str
    picture: str | None
    department: str | None
    sg_role: Literal["boss", "capo", "soldier"] | None = Field(
        description="The Student Government role; null outside SG"
    )
    content: dict | None
    can_edit: bool
