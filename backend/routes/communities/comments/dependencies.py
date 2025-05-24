from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import check_token, get_db_session
from backend.core.database.models.community import CommunityComment
from backend.core.database.models.user import UserRole
from backend.routes.communities.comments.schemas import CommunityCommentRequestSchema


async def check_comment_ownership(
    comment_id: int,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> bool:
    if user.get("role") == UserRole.admin:
        return True
    qb = QueryBuilder(session=db_session, model=CommunityComment)
    comment: CommunityComment | None = (
        await qb.base().filter(CommunityComment.id == comment_id).first()
    )

    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_sub != user["sub"]:
        raise HTTPException(status_code=403, detail="You are not the owner of this comment")
    return True


async def verify_comment(
    comment: CommunityCommentRequestSchema,
    user: Annotated[dict, Depends(check_token)],
) -> bool:
    if comment.user_sub != user["sub"]:
        raise HTTPException(status_code=403, detail="You are not allowed do this as another user")
    return True
