from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session, get_infra
from backend.common.schemas import Infra
from backend.modules.google_bucket.gcs_storage import GcsObjectStorage
from backend.modules.media.repository import MediaRepository
from backend.modules.media.service import MediaService


def build_media_service(db_session: AsyncSession, infra: Infra) -> MediaService:
    storage = GcsObjectStorage(
        storage_client=infra.storage_client,
        config=infra.config,
        signing_credentials=infra.signing_credentials,
    )
    return MediaService(
        repository=MediaRepository(db_session),
        storage=storage,
    )


def get_media_service(
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
) -> MediaService:
    return build_media_service(db_session, infra)
