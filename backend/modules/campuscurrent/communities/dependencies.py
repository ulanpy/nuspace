from fastapi import Depends

from backend.common.dependencies import get_infra, get_uow
from backend.common.schemas import Infra
from backend.core.database.uow import UnitOfWork
from backend.modules.campuscurrent.communities.service import CommunityService
from backend.modules.media.dependencies import build_media_service


async def get_community_service(
    uow: UnitOfWork = Depends(get_uow),
    infra: Infra = Depends(get_infra),
) -> CommunityService:
    return CommunityService(
        uow=uow,
        media_attachment_resolver=build_media_service(
            uow=uow,
            storage_client=infra.storage_client,
            config=infra.config,
            signing_credentials=infra.signing_credentials,
        ),
    )
