# schemas.py

from pydantic import BaseModel, HttpUrl

from backend.core.database.models.media import MediaFormat, MediaTable


class SignedUrlRequest(BaseModel):
    media_table: MediaTable
    entity_id: int
    media_format: MediaFormat
    media_order: int
    mime_type: str


class SignedUrlResponse(BaseModel):
    filename: str
    upload_url: HttpUrl
    media_table: MediaTable
    entity_id: int
    media_format: MediaFormat
    media_order: int
    mime_type: str

class UploadConfirmation(BaseModel):
    filename: str
    mime_type: str
    media_table: MediaTable
    entity_id: int
    media_format: MediaFormat
    media_order: int


class ConfirmUploadRequest(BaseModel):
    filename: str
    url: HttpUrl


class MediaResponse(BaseModel):
    id: int
    url: str
    mime_type: str
    media_table: MediaTable
    entity_id: int
    media_format: MediaFormat
    media_order: int