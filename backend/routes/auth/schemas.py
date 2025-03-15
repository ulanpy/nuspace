from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
import uuid
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


