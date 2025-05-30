from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.utils.enums import ResourceAction
from backend.core.database.models.community import CommunityComment
from backend.core.database.models.user import UserRole
from backend.routes.communities.comments.schemas import RequestCommunityCommentSchema


class CommentPolicy:
    def __init__(self, db_session: AsyncSession):
        self.qb = QueryBuilder(session=db_session, model=CommunityComment)

    async def check_permission(
        self,
        action: ResourceAction,
        user: tuple[dict, dict],  # kc_principal and app_principal
        comment: CommunityComment | None = None,
        comment_data: RequestCommunityCommentSchema | None = None,
    ) -> bool:
        """
        Check if the user has permission to perform the action on the comment.
        """
        user_role: UserRole = user["role"]
        user_sub: str = user["sub"]
        if user_role == UserRole.admin.value:
            return True

        match action:
            case ResourceAction.READ:
                return True
            case ResourceAction.CREATE:
                if comment_data.user_sub != user_sub:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You are not allowed do this as another user",
                    )
                return True

            case ResourceAction.DELETE:
                if comment.user_sub != user_sub:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You are not the owner of this comment",
                    )
                return True
