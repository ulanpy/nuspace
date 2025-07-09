from datetime import timedelta
from typing import List

from fastapi import Request
from google.cloud import storage

from backend.core.database.models import Media


async def generate_download_url(
    request: Request,
    filename: str,
) -> dict:
    """
    Generates a signed download URL with:
    - 15 minute expiration
    - GET access only
    - Requires valid JWT
    """
    blob = request.app.state.storage_client.bucket(request.app.state.config.BUCKET_NAME).blob(
        filename
    )
    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=15),
        method="GET",
    )
    return {"signed_url": signed_url}


async def delete_bucket_object(
    request: Request,
    filename: str,
) -> None:
    blob = request.app.state.storage_client.bucket(request.app.state.config.BUCKET_NAME).blob(
        filename
    )
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
