from fastapi import HTTPException, status

from backend.core.database.models.user import UserRole
from backend.modules.campuscurrent.base import BasePolicy


class OpportunityPolicy(BasePolicy):
    """Policy: only privileged roles can create/update/delete opportunities."""

    ALLOWED_ROLES = {"admin", "boss"}
    ALLOWED_EMAILS = {
        "ministry.innovations@nu.edu.kz",
    }

    def check_manage(self) -> None:
        if self.user_role in self.ALLOWED_ROLES:
            return
        if self.user_creds and self.user_creds[0].get("email") in self.ALLOWED_EMAILS:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permissions to manage opportunities",
        )
