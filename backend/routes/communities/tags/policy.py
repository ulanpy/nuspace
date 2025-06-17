from fastapi import HTTPException, status

from backend.common.utils.enums import ResourceAction
from backend.core.database.models import CommunityPostTag
from backend.core.database.models.user import UserRole
from backend.routes.communities.tags.schemas import CommunityTagRequest


class TagPolicy:
    """
    Tag policy class for centralized permission checking.

    **Access Policy:**
    - Everyone can read tags
    - Only admins and community heads can create or delete tags
    """

    def __init__(self, user: tuple[dict, dict]):
        self.user = user
        self.user_role: UserRole = user[1]["role"]
        self.user_sub: str = user[0]["sub"]
        self.user_communities: list[int] = user[1]["communities"]

    async def check_permission(
        self,
        action: ResourceAction,
        tag: CommunityPostTag | None = None,
        tag_data: CommunityTagRequest | None = None,
    ) -> bool:
        """
        Check if the user has permission to perform the specified action.

        Args:
            action: The action to check permission for
            user: Tuple of (user_data, permissions)
            tag: The tag object for existing tag operations
            tag_data: The tag data for creation operations

        Returns:
            bool: True if the user has permission, raises HTTPException otherwise

        Raises:
            HTTPException: If the user doesn't have permission
            ValueError: If the action type is not handled
        """

        # Admin can do everything
        if self.user_role == UserRole.admin.value:
            return True

        if action == ResourceAction.READ:
            # All authenticated users can read
            return True

        elif action in [ResourceAction.CREATE, ResourceAction.DELETE]:
            # For create/delete, check if user is community head
            community_id = tag_data.community_id if tag_data else tag.community_id
            is_head = community_id in self.user_communities

            if not is_head:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins and community heads can manage tags",
                )
            return True

        # This should never happen as we've handled all enum cases
        raise ValueError(f"Unhandled action type: {action}")
