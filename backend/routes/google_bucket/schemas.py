from pydantic import BaseModel, Field
from typing import List
# Add response models

from backend.core.database.models.media import MediaSection, MediaPurpose

class SignedUrlResponse(BaseModel):
    signed_urls: List[dict]


class UploadConfirmation(BaseModel):
    filename: str
    mime_type: str
    section: MediaSection
    entity_id: int
    media_purpose: MediaPurpose
    media_order: int


class MediaResponse(BaseModel):
    id: int
    url: str
    mime_type: str
    section: MediaSection
    entity_id: int
    media_purpose: MediaPurpose
    media_order: int
