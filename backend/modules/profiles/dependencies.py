from fastapi import Depends

from backend.common.dependencies import get_infra, get_uow
from backend.common.schemas import Infra
from backend.core.database.uow import UnitOfWork
from backend.modules.media.dependencies import get_media_service
from backend.modules.media.service import MediaService
from backend.modules.profiles.service import ProfileService


async def get_profile_service(
    infra: Infra = Depends(get_infra),
    uow: UnitOfWork = Depends(get_uow),
    media: MediaService = Depends(get_media_service),
) -> ProfileService:
    return ProfileService(
        uow=uow, storage=media.storage, meilisearch_client=infra.meilisearch_client
    )
