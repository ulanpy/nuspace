from typing import Any, Dict

from pydantic import BaseModel, EmailStr, Field

from backend.modules.auth.models import UserRole, UserScope


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
