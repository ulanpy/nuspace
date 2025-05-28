from enum import Enum
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import check_role, check_token, get_db_session
from backend.core.database.models.community import Community
from backend.core.database.models.user import UserRole


class CommunityAction(str, Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"


class CommunityPolicy:
    """
    Community policy class for centralized permission checking.

    **Note**
    When extending this class, keep in mind that it should only handle permission checking.
    All other logic should be kept outside of this class.
    """

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def _get_community(self, community_id: int) -> Optional[Community]:
        """Helper method to fetch community"""
        qb = QueryBuilder(session=self.db_session, model=Community)
        return await qb.base().filter(Community.id == community_id).first()

    async def check_permission(
        self,
        action: CommunityAction,
        user: dict,
        user_role: UserRole,
        community_id: Optional[int] = None,
    ) -> bool:
        """
        Centralized permission checking for community actions.

        Args:
            action: The action being performed
            user: The user performing the action
            user_role: The role of the user
            community_id: Optional community ID for actions that require it

        Raises:
            HTTPException: If the user doesn't have permission
        """

        # Admin can do everything
        if user_role == UserRole.admin:
            return True

        if action == CommunityAction.CREATE:
            if user_role != UserRole.admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can create communities",
                )
            return True

        elif action == CommunityAction.READ:
            # All authenticated users can read
            return True

        elif action == CommunityAction.UPDATE:
            if not community_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Community ID required for update",
                )

            community = await self._get_community(community_id)
            if not community:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Community not found"
                )

            # Check if user is head of community
            if community.head_user.sub == user["sub"]:
                return True

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins or community heads can update communities",
            )

        elif action == CommunityAction.DELETE:
            if user_role != UserRole.admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can delete communities",
                )
            return True

        # This should never happen as we've handled all enum cases
        raise ValueError(f"Unhandled action type: {action}")


# Dependency functions for different actions
async def get_community_policy(
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityPolicy:
    return CommunityPolicy(db_session)


async def check_create_permission(
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[UserRole, Depends(check_role)],
    policy: Annotated[CommunityPolicy, Depends(get_community_policy)],
) -> dict:
    await policy.check_permission(CommunityAction.CREATE, user, role)
    return user


async def check_read_permission(
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[UserRole, Depends(check_role)],
    policy: Annotated[CommunityPolicy, Depends(get_community_policy)],
) -> dict:
    await policy.check_permission(CommunityAction.READ, user, role)
    return user


async def check_update_permission(
    community_id: int,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[UserRole, Depends(check_role)],
    policy: Annotated[CommunityPolicy, Depends(get_community_policy)],
) -> dict:
    await policy.check_permission(CommunityAction.UPDATE, user, role, community_id=community_id)
    return user


async def require_delete_permission(
    community_id: int,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[UserRole, Depends(check_role)],
    policy: Annotated[CommunityPolicy, Depends(get_community_policy)],
) -> dict:
    await policy.check_permission(CommunityAction.DELETE, user, role, community_id=community_id)
    return user
