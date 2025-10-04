from datetime import timedelta

from google.cloud import storage

from backend.core.configs.config import config
from backend.modules.google_bucket.utils import get_signing_credentials


async def generate_download_url(storage_client: storage.Client, filename: str):
    """
    Generates a signed download URL with:
    - 15 minute expiration
    - GET access only
    - Requires valid JWT
    """
    # Generate signed URL using impersonated credentials to avoid private key requirement
    impersonated_credentials = get_signing_credentials(config.VM_SERVICE_ACCOUNT_EMAIL)

    blob = storage_client.bucket(config.BUCKET_NAME).blob(filename)

    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=15),
        method="GET",
        response_type="image/jpeg",
        credentials=impersonated_credentials,
    )
    return signed_url
