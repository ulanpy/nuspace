from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.utils.enums import ResourceAction
from backend.core.database.models import CommunityPost
from backend.routes.communities.posts.schemas import CommunityPostRequestSchema


class PostPolicy:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def check_permission(
        self,
        action: ResourceAction,
        user: tuple[dict, dict],
        post: CommunityPost | None = None,
        post_data: CommunityPostRequestSchema | None = None,
    ) -> bool:
        pass
