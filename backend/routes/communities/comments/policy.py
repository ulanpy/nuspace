from fastapi import HTTPException, status

from backend.common.utils.enums import ResourceAction
from backend.core.database.models.community import CommunityComment
from backend.core.database.models.user import UserRole
from backend.routes.communities.comments.schemas import RequestCommunityCommentSchema


class CommentPolicy:
    def __init__(self, user: tuple[dict, dict]):
        self.user = user
        self.user_role: UserRole = user[1]["role"]
        self.user_sub: str = user[0]["sub"]
        self.user_communities: list[int] = user[1]["communities"]

    async def check_permission(
        self,
        action: ResourceAction,
        comment: CommunityComment | None = None,
        comment_data: RequestCommunityCommentSchema | None = None,
        include_deleted: bool = False,
    ) -> bool:
        """
        Check if the user has permission to perform the action on the comment.
        """
        if self.user_role == UserRole.admin.value:
            return True

        match action:
            case ResourceAction.READ:
                if include_deleted:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You are not allowed to read this comment",
                    )
                return True
            case ResourceAction.CREATE:
                if comment_data.user_sub != self.user_sub and comment_data.user_sub != "me":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You are not allowed do this as another user",
                    )
                return True

            case ResourceAction.DELETE:
                if comment.user_sub != self.user_sub:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You are not the owner of this comment",
                    )
                return True
