from typing import List

from backend.core.configs.config import Config
from faststream.rabbit import RabbitBroker
from google.auth.credentials import Credentials
from google.cloud import storage
from httpx import AsyncClient
from pydantic import BaseModel
from redis.asyncio import Redis


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
    can_view_attendees: bool = False
    can_share_access: bool = False
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
