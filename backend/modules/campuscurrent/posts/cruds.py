from typing import List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models import CommunityPost
from backend.core.database.models.community import CommunityComment

"""exception case that QueryBuilder is unable to handle"""


async def get_comment_counts(db_session: AsyncSession, posts: List[CommunityPost]) -> dict:
    """map post id to comment count
    return dict of post id and comment count"""
    stmt = (
        select(CommunityComment.post_id, func.count(CommunityComment.id))
        .where(CommunityComment.post_id.in_([post.id for post in posts]))
        .group_by(CommunityComment.post_id)
    )
    result = await db_session.execute(stmt)
    comments_count_dict = dict(result.all())
    return comments_count_dict
