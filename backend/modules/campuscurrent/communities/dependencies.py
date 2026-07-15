from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session, get_infra
from backend.common.schemas import Infra
from backend.modules.campuscurrent.communities.service import CommunityService
from backend.modules.media.dependencies import build_media_service


def get_community_service(
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
) -> CommunityService:
    return CommunityService(
        db_session=db_session,
        media_attachment_resolver=build_media_service(db_session, infra),
    )
