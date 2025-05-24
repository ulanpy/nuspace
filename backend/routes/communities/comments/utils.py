from typing import List

from backend.common.schemas import MediaResponse
from backend.core.database.models.community import CommunityComment
from backend.routes.communities.comments.schemas import CommunityCommentSchema


def build_comment_response(
    comment: CommunityComment, media: List[MediaResponse]
) -> CommunityCommentSchema:
    return CommunityCommentSchema(
        id=comment.id,
        post_id=comment.post_id,
        parent_id=comment.parent_id,
        user_sub=comment.user_sub,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        media=media,
    )
