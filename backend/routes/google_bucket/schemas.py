from pydantic import BaseModel, Field
from typing import List
# Add response models

from backend.core.database.models.media import MediaSection

class SignedUrlResponse(BaseModel):
    signed_urls: List[dict]


class UploadConfirmation(BaseModel):
    filename: str
    mime_type: str  # MIME type sent by the client
    section: MediaSection
    entity_id: int