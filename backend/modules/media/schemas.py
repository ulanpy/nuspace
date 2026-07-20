from pydantic import BaseModel

from backend.modules.media.models import EntityType
from backend.modules.media.models import MediaFormat


class MediaResponse(BaseModel):
    id: int
    url: str
    mime_type: str
    entity_type: EntityType
    entity_id: int
    media_format: MediaFormat
    media_order: int


class MediaUpsertData(BaseModel):
    name: str
    mime_type: str
    entity_type: EntityType
    entity_id: int
    media_format: MediaFormat
    media_order: int
