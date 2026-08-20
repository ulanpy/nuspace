from backend.common.dependencies import get_infra, get_uow
from backend.common.schemas import Infra
from backend.core.configs.config import Config
from backend.core.database.uow import UnitOfWork
from backend.modules.google_bucket.gcs_storage import GcsObjectStorage
from backend.modules.media.service import MediaService
from fastapi import Depends
from google.auth.credentials import Credentials
from google.cloud import storage


def build_media_service(
    uow: UnitOfWork,
    storage_client: storage.Client,
    config: Config,
    signing_credentials: Credentials | None,
) -> MediaService:
    storage = GcsObjectStorage(
        storage_client=storage_client,
        config=config,
        signing_credentials=signing_credentials,
    )
    return MediaService(uow=uow, storage=storage)


async def get_media_service(
    uow: UnitOfWork = Depends(get_uow),
    infra: Infra = Depends(get_infra),
) -> MediaService:
    return build_media_service(
        uow=uow,
        storage_client=infra.storage_client,
        config=infra.config,
        signing_credentials=infra.signing_credentials,
    )
