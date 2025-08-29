from fastapi import HTTPException, status

from backend.common.utils.enums import ResourceAction
from backend.core.database.models.media import Media
from backend.core.database.models.user import UserRole


class GoogleBucketPolicy:
    """
    Google bucket policy class for centralized permission checking.

    **Note**
    When extending this class, keep in mind that it should only handle permission checking.
    All other logic should be kept outside of this class.
    """

    def __init__(self, user: tuple[dict, dict]):
        self.user = user
        self.user_role: UserRole = user[1]["role"]
        self.user_sub: str = user[0]["sub"]

    async def check_permission(
        self,
        action: ResourceAction,
        owner_sub: str | None = None,
        media: Media | None = None,
    ) -> bool:
        """
        Centralized permission checking for google bucket actions.

        Args:
            action: The action being performed
            user: The user performing the action
            media: Optional media object for actions that require it

        Raises:
            HTTPException: If the user doesn't have permission
        """
        # Admin can do everything
        if self.user_role == UserRole.admin:
            return True

        if action == ResourceAction.CREATE:
            # skip for now
            return True

        elif action == ResourceAction.READ:
            # skip for now
            return True

        elif action == ResourceAction.UPDATE:
            # skip for now
            return True

        elif action == ResourceAction.DELETE:
            # Allow if requester is the resource owner
            if owner_sub is not None and self.user_sub == owner_sub:
                return True
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

        # This should never happen as we've handled all enum cases
        raise ValueError(f"Unhandled action type: {action}")
