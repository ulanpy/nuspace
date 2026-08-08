from backend.common.dependencies import get_infra, get_uow
from backend.common.schemas import Infra
from backend.core.database.uow import UnitOfWork
from backend.modules.google_bucket.gcs_storage import GcsObjectStorage
from backend.modules.media.service import MediaService
from fastapi import Depends


def build_media_service(uow: UnitOfWork, infra: Infra) -> MediaService:
    storage = GcsObjectStorage(
        storage_client=infra.storage_client,
        config=infra.config,
        signing_credentials=infra.signing_credentials,
    )
    return MediaService(uow=uow, storage=storage)


def get_media_service(
    uow: UnitOfWork = Depends(get_uow),
    infra: Infra = Depends(get_infra),
) -> MediaService:
    return build_media_service(uow, infra)
