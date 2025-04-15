# schemas.py
from pydantic import BaseModel, Field, HttpUrl
from typing import List
from backend.core.database.models.media import MediaSection, MediaPurpose

# Keep original if you adapt /upload-url to handle lists of mime_types


# New response for single URL generation
class SingleSignedUrlResponse(BaseModel):
    filename: str
    upload_url: HttpUrl

class SignedUrlResponse(BaseModel):
   signed_urls: List[SingleSignedUrlResponse]

class UploadConfirmation(BaseModel):
    filename: str
    mime_type: str
    section: MediaSection
    entity_id: int
    media_purpose: MediaPurpose
    media_order: int

class ConfirmUploadRequest(BaseModel):
    filename: str
    url: HttpUrl

class MediaResponse(BaseModel):
    id: int
    url: str
    mime_type: str
    section: MediaSection
    entity_id: int
    media_purpose: MediaPurpose
    media_order: int