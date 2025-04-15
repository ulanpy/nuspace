from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
import uuid
from typing import Any
from backend.core.database.models.user import UserRole, UserScope

from pydantic import BaseModel, HttpUrl, EmailStr
from typing import Dict

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