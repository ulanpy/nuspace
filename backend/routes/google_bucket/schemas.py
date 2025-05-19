# schemas.py

from pydantic import BaseModel, HttpUrl

from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import MediaFormat


class SignedUrlRequest(BaseModel):
    entity_type: EntityType
    entity_id: int
    media_format: MediaFormat
    media_order: int
    mime_type: str


class SignedUrlResponse(BaseModel):
    filename: str
    upload_url: HttpUrl
    entity_type: EntityType
    entity_id: int
    media_format: MediaFormat
    media_order: int
    mime_type: str


class UploadConfirmation(BaseModel):
    filename: str
    mime_type: str
    entity_type: EntityType
    entity_id: int
    media_format: MediaFormat
    media_order: int


class ConfirmUploadRequest(BaseModel):
    filename: str
    url: HttpUrl
