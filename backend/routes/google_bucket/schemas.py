# schemas.py

from pydantic import BaseModel, HttpUrl

from backend.core.database.models.media import MediaPurpose, MediaSection


class SignedUrlRequest(BaseModel):
    section: MediaSection
    entity_id: int
    media_purpose: MediaPurpose
    media_order: int
    mime_type: str
    content_type: str


class SignedUrlResponse(BaseModel):
    filename: str
    upload_url: HttpUrl
    section: MediaSection
    entity_id: int
    media_purpose: MediaPurpose
    media_order: int
    mime_type: str
    content_type: str


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
