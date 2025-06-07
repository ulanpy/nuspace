from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.utils.enums import ResourceAction
from backend.core.database.models import CommunityPost
from backend.core.database.models.user import UserRole
from backend.routes.communities.posts.schemas import CommunityPostRequest


class PostPolicy:
    """
    Post policy class for centralized permission checking.

    **Access Policy:**
    - Admin can do everything
    - For creating posts:
      - Community heads can set from_community=true
      - Others must set from_community=false or not include it
      - Only admins can write any user_sub, others must use their own or "me"
    - For updating/deleting posts:
      - Only post creators and admins can modify/delete their posts
    """

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def check_permission(
        self,
        action: ResourceAction,
        user: tuple[dict, dict],
        post: CommunityPost | None = None,
        post_data: CommunityPostRequest | None = None,
    ) -> bool:
        """
        Centralized permission checking for post actions.

        Args:
            action: The action being performed
            user: The user performing the action
            post: Optional post object for update/delete actions
            post_data: Optional post data for create/update actions

        Returns:
            bool: True if the user has permission

        Raises:
            HTTPException: If the user doesn't have permission
            ValueError: If the action type is not handled
        """
        user_role = user[1]["role"]
        user_sub = user[0]["sub"]
        user_communities = user[1]["communities"]

        # Admin can do everything
        if user_role == UserRole.admin.value:
            return True

        if action == ResourceAction.CREATE:
            # Validate user_sub - only admins can write as other users
            if post_data.user_sub != "me" and post_data.user_sub != user_sub:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only create posts as yourself",
                )

            # Validate from_community flag
            if post_data.from_community is True:
                # Check if user is head of the community
                is_head = post_data.community_id in user_communities
                if not is_head:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Only community heads can create posts with from_community=true",
                    )
            return True

        elif action == ResourceAction.READ:
            # All authenticated users can read posts
            return True

        elif action == ResourceAction.UPDATE:
            # Only post creator can update their posts
            if post.user_sub != user_sub:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only post creators can update their posts",
                )
            return True

        elif action == ResourceAction.DELETE:
            # Only post creator can delete their posts
            if post.user_sub != user_sub:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only post creators can delete their posts",
                )
            return True

        # This should never happen as we've handled all enum cases
        raise ValueError(f"Unhandled action type: {action}")
