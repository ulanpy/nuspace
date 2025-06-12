from fastapi import HTTPException, status

from backend.common.utils.enums import ResourceAction
from backend.core.database.models.community import Community
from backend.core.database.models.user import UserRole
from backend.routes.communities.communities.schemas import CommunityCreateRequest


class CommunityPolicy:
    """
    Community policy class for centralized permission checking.

    **Note**
    When extending this class, keep in mind that it should only handle permission checking.
    All other logic should be kept outside of this class.
    """

    def __init__(self):
        pass

    async def check_permission(
        self,
        action: ResourceAction,
        user: tuple[dict, dict],
        community: Community | None = None,
        community_data: CommunityCreateRequest | None = None,
    ) -> bool:
        """
        Centralized permission checking for community actions.

        Args:
            action: The action being performed
            user: The user performing the action
            community: Optional community object for actions that require it

        Raises:
            HTTPException: If the user doesn't have permission
        """
        user_role: UserRole = user[1]["role"]
        user_sub: str = user[0]["sub"]
        # Admin can do everything
        if user_role == UserRole.admin:
            return True

        if action == ResourceAction.CREATE:
            if user_role != UserRole.admin.value:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can create communities",
                )
            return True

        elif action == ResourceAction.READ:
            # All authenticated users can read
            return True

        elif action == ResourceAction.UPDATE:

            # Check if user is head of community
            if community.head_user.sub == user_sub:
                return True

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins or community heads can update communities",
            )

        elif action == ResourceAction.DELETE:
            if user_role != UserRole.admin.value:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can delete communities",
                )
            return True

        # This should never happen as we've handled all enum cases
        raise ValueError(f"Unhandled action type: {action}")
