from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import check_role, check_token, get_db_session
from backend.core.database.models.user import UserRole
from backend.routes.communities.comments.policy import CommentAction, CommentPolicy
from backend.routes.communities.comments.schemas import RequestCommunityCommentSchema


async def get_comment_policy(
    db_session: AsyncSession = Depends(get_db_session),
) -> CommentPolicy:
    return CommentPolicy(db_session)


async def check_create_permission(
    comment: RequestCommunityCommentSchema,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[UserRole, Depends(check_role)],
    policy: Annotated[CommentPolicy, Depends(get_comment_policy)],
) -> dict:
    await policy.check_permission(CommentAction.CREATE, user, role, comment=comment)
    return user


async def check_read_permission(
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[UserRole, Depends(check_role)],
    policy: Annotated[CommentPolicy, Depends(get_comment_policy)],
) -> dict:
    await policy.check_permission(CommentAction.READ, user, role)
    return user


async def check_delete_permission(
    comment_id: int,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[UserRole, Depends(check_role)],
    policy: Annotated[CommentPolicy, Depends(get_comment_policy)],
) -> dict:
    await policy.check_permission(CommentAction.DELETE, user, role, comment_id=comment_id)
    return user
