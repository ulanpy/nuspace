from typing import Any, Dict

from pydantic import BaseModel, EmailStr

from backend.core.database.models.user import UserRole, UserScope


class UserSchema(BaseModel):
    email: EmailStr
    role: UserRole
    scope: UserScope
    name: str
    surname: str
    picture: str
    sub: str


class Sub(BaseModel):
    sub: str


class CurrentUserResponse(BaseModel):
    user: Dict[str, Any]  # This will store user token data
    tg_linked: bool  # Indicates if user exists in the database
