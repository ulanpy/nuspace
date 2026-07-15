from __future__ import annotations

import asyncio
from datetime import timedelta

from google.auth.credentials import Credentials
from google.cloud import storage

from backend.core.configs.config import Config
from backend.modules.media.interfaces import ObjectStorage


class GcsObjectStorage:
    """GCS adapter implementing the media module's ObjectStorage port."""

    def __init__(
        self,
        storage_client: storage.Client,
        config: Config,
        signing_credentials: Credentials | None,
    ):
        self.storage_client = storage_client
        self.config = config
        self.signing_credentials = signing_credentials

    async def generate_download_urls(self, filenames: list[str]) -> list[str]:
        if not filenames:
            return []

        if self.config.USE_GCS_EMULATOR:
            base_url = f"{self.config.HOME_URL}/api/bucket/local-download/{self.config.BUCKET_NAME}"
            return [f"{base_url}/{filename}" for filename in filenames]

        bucket = self.storage_client.bucket(self.config.BUCKET_NAME)
        blobs = [bucket.blob(filename) for filename in filenames]

        async def sign_single_blob(blob: storage.Blob) -> str:
            return await asyncio.to_thread(
                blob.generate_signed_url,
                version="v4",
                expiration=timedelta(minutes=15),
                method="GET",
                credentials=self.signing_credentials,
            )

        return list(await asyncio.gather(*[sign_single_blob(blob) for blob in blobs]))

    async def delete_object(self, filename: str) -> None:
        blob = self.storage_client.bucket(self.config.BUCKET_NAME).blob(filename)
        try:
            blob.delete()
        except Exception:
            pass

    async def delete_objects(self, filenames: list[str]) -> None:
        if not filenames:
            return

        bucket = self.storage_client.bucket(self.config.BUCKET_NAME)
        blobs = [bucket.blob(filename) for filename in filenames]

        for i in range(0, len(blobs), 100):
            batch = blobs[i : i + 100]
            try:
                with self.storage_client.batch():
                    for blob in batch:
                        blob.delete()
            except Exception:
                for blob in batch:
                    try:
                        blob.delete()
                    except Exception:
                        pass
