import asyncio
from datetime import timedelta
from typing import List, Optional

import google.auth
import google.auth.transport.requests
from fastapi import Request
from google.auth import impersonated_credentials
from google.auth.credentials import Credentials
from google.cloud import storage

from backend.core.configs.config import Config
from backend.core.database.models import Media


async def generate_batch_download_urls(
    request: Request,
    filenames: List[str],
) -> List[dict]:
    """
    Generates download URLs for multiple files in batch for optimal performance.
    - In production: signed URLs valid for 15 minutes (GET only)
    - In emulator mode: direct proxy URLs via nginx (/gcs/{bucket}/{object})

    This function significantly improves performance by:
    1. Batching credential checks and refreshes
    2. Using a single asyncio.gather for all signing operations
    3. Avoiding repeated credential validation per file

    Args:
        request: FastAPI request object
        filenames: List of filenames to generate URLs for

    Returns:
        List of dicts with signed_url keys, in the same order as input filenames
    """
    if not filenames:
        return []

    config: Config = request.app.state.config

    if config.USE_GCS_EMULATOR:
        # Use backend proxy to avoid nginx /gcs path issues during local dev
        base_url = f"{config.HOME_URL}/api/bucket/local-download/{config.BUCKET_NAME}"
        return [{"signed_url": f"{base_url}/{filename}"} for filename in filenames]

    # Use cached impersonated credentials from app startup
    # Falls back to creating fresh credentials if cache failed at startup or expired
    signing_credentials = request.app.state.signing_credentials
    if signing_credentials is None or (
        hasattr(signing_credentials, "expired") and signing_credentials.expired
    ):
        # Fallback: create fresh credentials (this will be slower)
        signing_credentials = get_signing_credentials(config.VM_SERVICE_ACCOUNT_EMAIL)
        # Update the cache with fresh credentials
        request.app.state.signing_credentials = signing_credentials

    # Prepare all blobs
    bucket = request.app.state.storage_client.bucket(config.BUCKET_NAME)
    blobs = [bucket.blob(filename) for filename in filenames]

    # Move all synchronous signing operations to threads and execute in parallel

    async def sign_single_blob(blob: storage.Blob) -> str:
        return await asyncio.to_thread(
            blob.generate_signed_url,
            version="v4",
            expiration=timedelta(minutes=15),
            method="GET",
            credentials=signing_credentials,
        )

    # Execute all signing operations in parallel
    signed_urls = await asyncio.gather(*[sign_single_blob(blob) for blob in blobs])

    return [{"signed_url": url} for url in signed_urls]


async def delete_bucket_object(
    request: Request,
    filename: str,
) -> None:
    blob: storage.Blob = request.app.state.storage_client.bucket(
        request.app.state.config.BUCKET_NAME
    ).blob(filename)
    try:
        blob.delete()
    except Exception:
        pass


async def batch_delete_blobs(request: Request, media_objects: List[Media]) -> None:
    """
    Bulk delete all media files associated with given `media_objects` using GCS batch operations.

    This function optimizes deletion of multiple files by using Google Cloud Storage's batch
    operations. While the code uses a loop to collect delete operations, the actual HTTP
    requests are batched behind the scenes:

    1. Files are processed in chunks of 100 (GCS recommended batch size)
    2. For each chunk, a batch context is created
    3. Inside the batch context:
       - delete() calls don't execute immediately
       - instead, they are collected/queued up
    4. When the batch context exits:
       - all queued operations are sent in a single HTTP request
       - e.g., 100 deletes = 1 HTTP request (instead of 100 requests)

    Example:
        For 250 files, this results in:
        - Batch 1: 100 files -> 1 HTTP request
        - Batch 2: 100 files -> 1 HTTP request
        - Batch 3: 50 files -> 1 HTTP request
        Total: 3 HTTP requests (instead of 250)

    Args:
        request: FastAPI request object containing GCS client
        media_objects: List of media objects to delete

    Note:
        - If media_objects is empty, function returns immediately without any operations
        - If a batch operation fails, the function falls back to individual deletions
          for that batch to ensure maximum possible cleanup.
    """
    # Early return if no media objects to process
    if not media_objects:
        return

    # Get storage client and bucket
    storage_client: storage.Client = request.app.state.storage_client
    bucket: storage.Bucket = storage_client.bucket(request.app.state.config.BUCKET_NAME)

    # Create a batch of blobs to delete
    blobs_to_delete: List[storage.Blob] = [bucket.blob(media.name) for media in media_objects]

    # Delete blobs in batches of 100 (GCS recommended batch size)
    for i in range(0, len(blobs_to_delete), 100):
        batch = blobs_to_delete[i : i + 100]
        try:
            with storage_client.batch():
                for blob in batch:
                    blob.delete()
        except Exception:
            # If batch deletion fails, fall back to individual deletion
            for blob in batch:
                try:
                    blob.delete()
                except Exception:
                    pass


"""
Google Cloud Platform authentication utilities for service account impersonation.

This module provides utilities to generate impersonated credentials that can be used
to sign URLs without requiring hardcoded service account keys.
"""


def get_impersonated_credentials(
    target_principal: str,
    scopes: Optional[list[str]] = None,
    lifetime: int = 3600,
) -> Credentials:
    """
    Create impersonated credentials for a target service account.

    This function uses the current default credentials (from compute engine metadata server)
    to impersonate the specified service account. This allows generating signed URLs
    without needing hardcoded service account keys.

    Args:
        target_principal: Email address of the service account to impersonate
        scopes: OAuth 2.0 scopes for the impersonated credentials
        lifetime: Lifetime of the impersonated credentials in seconds (max 3600)

    Returns:
        Impersonated credentials that can be used for signing operations

    Raises:
        google.auth.exceptions.DefaultCredentialsError: If default credentials cannot be obtained
        google.auth.exceptions.RefreshError: If credentials cannot be refreshed
    """
    if scopes is None:
        scopes = ["https://www.googleapis.com/auth/cloud-platform"]

    # Get default credentials from the compute engine metadata server
    source_credentials, _ = google.auth.default(scopes=scopes)

    # Ensure the source credentials are refreshed
    if source_credentials.token is None:
        request = google.auth.transport.requests.Request()
        source_credentials.refresh(request)

    # Create impersonated credentials
    impersonated_creds = impersonated_credentials.Credentials(
        source_credentials=source_credentials,
        target_principal=target_principal,
        target_scopes=scopes,
        lifetime=lifetime,
    )

    return impersonated_creds


def get_signing_credentials(service_account_email: str) -> Credentials:
    """
    Get credentials suitable for signing operations (like generating signed URLs).

    This is a convenience function that creates impersonated credentials specifically
    for signing operations with a reasonable lifetime.

    Args:
        service_account_email: Email of the service account to impersonate for signing

    Returns:
        Credentials that can be used for signing operations
    """
    return get_impersonated_credentials(
        target_principal=service_account_email,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
        lifetime=3600,  # 1 hour should be sufficient for most operations
    )
