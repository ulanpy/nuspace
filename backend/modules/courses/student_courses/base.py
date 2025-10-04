from fastapi import HTTPException
from fastapi import status as http_status

from backend.core.database.models.user import UserRole


class BasePolicy:
    """Base policy with common user attributes."""

    def __init__(self, user: tuple[dict, dict]):
        if not user or not user[0] or not user[1]:
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials were not provided",
            )
        self.user_creds = user
        self.user_role = user[1]["role"]
        self.user_sub = user[0]["sub"]
        self.is_admin = self.user_role == UserRole.admin.value

    def _is_owner(self, author_sub: str) -> bool:
        return self.user_sub == author_sub
