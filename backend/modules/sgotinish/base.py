from backend.core.database.models.user import UserRole


from fastapi import HTTPException
from fastapi import status as http_status


class BasePolicy:
    """Base policy with common user attributes."""

    def __init__(self, user_creds: tuple[dict, dict]):
        if not user_creds or not user_creds[0] or not user_creds[1]:
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials were not provided",
            )
        self.user_creds = user_creds
        self.user_role = UserRole(user_creds[1]["role"])
        self.user_sub = user_creds[0]["sub"]
        self.department_id = user_creds[1].get("department_id")
        self.is_admin = self.user_role == UserRole.admin.value
        self.is_sg_member = self.user_role in [
            UserRole.boss.value,
            UserRole.capo.value,
            UserRole.soldier.value,
        ]

    def _is_owner(self, author_sub: str) -> bool:
        return self.user_sub == author_sub
