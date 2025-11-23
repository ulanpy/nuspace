from typing import List

from backend.core.configs.config import Config
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import MediaFormat
from google.auth.credentials import Credentials
from google.cloud import storage
from httpx import AsyncClient
from redis.asyncio import Redis
from faststream.rabbit import RabbitBroker
from pydantic import BaseModel


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


class ResourcePermissions(BaseModel):
    can_edit: bool = False
    can_delete: bool = False
    editable_fields: List[str] = []


class Infra(BaseModel):
    """Infrastructure dependencies for FastAPI instance"""

    meilisearch_client: AsyncClient
    storage_client: storage.Client
    config: Config
    signing_credentials: Credentials | None = None
    redis: Redis
    broker: RabbitBroker
    class Config:
        arbitrary_types_allowed = True
