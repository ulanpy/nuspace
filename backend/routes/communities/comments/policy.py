from enum import Enum

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.core.database.models.community import CommunityComment, CommunityPost
from backend.core.database.models.user import UserRole
from backend.routes.communities.comments.schemas import RequestCommunityCommentSchema


class CommentAction(str, Enum):
    READ = "read"
    CREATE = "create"
    DELETE = "delete"


class CommentPolicy:
    def __init__(self, db_session: AsyncSession):
        self.qb = QueryBuilder(session=db_session, model=CommunityComment)

    async def _get_comment(self, comment_id: int) -> CommunityComment | None:
        return await self.qb.blank().base().filter(CommunityComment.id == comment_id).first()

    async def _get_post(self, post_id: int) -> CommunityPost | None:
        return (
            await self.qb.blank(model=CommunityPost)
            .base()
            .filter(CommunityPost.id == post_id)
            .first()
        )

    async def check_permission(
        self,
        action: CommentAction,
        user: dict,
        user_role: UserRole,
        comment_id: int | None = None,
        comment: RequestCommunityCommentSchema | None = None,
    ) -> bool:

        if user_role == UserRole.admin:
            return True

        match action:
            case CommentAction.READ:
                return True
            case CommentAction.CREATE:
                if comment.user_sub != user["sub"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You are not allowed do this as another user",
                    )
                post: CommunityPost | None = await self._get_post(comment.post_id)
                if post is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST, detail="Non-existing post id"
                    )
                if comment.parent_id is not None:
                    parent_comment: CommunityComment | None = await self._get_comment(
                        comment.parent_id
                    )
                    if parent_comment is None:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found"
                        )
                    if parent_comment.post_id != comment.post_id:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Parent comment does not belong to the post",
                        )
                return True
            case CommentAction.DELETE:
                comm: CommunityComment | None = await self._get_comment(comment_id)
                if comm is None:
                    raise HTTPException(status_code=404, detail="Comment not found")
                if comm.user_sub != user["sub"]:
                    raise HTTPException(
                        status_code=403, detail="You are not the owner of this comment"
                    )
                return True
