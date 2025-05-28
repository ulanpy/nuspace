from pydantic import BaseModel

from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import MediaFormat


class MediaResponse(BaseModel):
    id: int
    url: str
    mime_type: str
    entity_type: EntityType
    entity_id: int
    media_format: MediaFormat
    media_order: int


class ShortUserResponse(BaseModel):
    sub: str
    name: str
    surname: str
    picture: str

    class Config:
        from_attributes = True
