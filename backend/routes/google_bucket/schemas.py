import base64
from typing import Any, Dict

from pydantic import BaseModel, Field, HttpUrl, computed_field

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


class MediaMetadata(BaseModel):
    name: str
    mime_type: str
    entity_type: EntityType
    entity_id: int
    media_format: MediaFormat
    media_order: int


class ConfirmUploadRequest(BaseModel):
    filename: str
    url: HttpUrl


class GCSEventAttributes(BaseModel):
    """GCS event attributes that come with the notification"""

    eventType: str | None = Field(None, description="Type of GCS event (e.g., OBJECT_FINALIZE)")
    eventId: str | None = Field(None, description="Unique event identifier")
    bucketId: str | None = Field(None, description="Bucket ID")
    objectId: str | None = Field(None, description="Object ID")
    objectGeneration: str | None = Field(None, description="Object generation")
    objectVersion: str | None = Field(None, description="Object version")


class PubSubMessageData(BaseModel):
    """Inner structure of the Pub/Sub message data field"""

    data: str = Field(..., description="Base64 encoded GCS event data")
    attributes: Dict[str, Any] | None = Field(None, description="Additional message attributes")
    messageId: str | None = Field(None, description="Unique message identifier")
    publishTime: str | None = Field(None, description="Message publish timestamp")

    @computed_field
    @property
    def decoded_data(self) -> str:
        """Automatically decode the base64 data"""
        return base64.b64decode(self.data).decode("utf-8")

    @computed_field
    @property
    def gcs_event(self) -> "GCSEventData":
        """Automatically parse the decoded data into GCSEventData"""
        return GCSEventData.model_validate_json(self.decoded_data)


class PubSubMessage(BaseModel):
    """Complete Pub/Sub message structure"""

    message: PubSubMessageData = Field(
        ..., description="The Pub/Sub message containing the event data"
    )
    subscription: str | None = Field(None, description="Pub/Sub subscription name")


class GCSMetadata(BaseModel):
    filename: str = Field(..., description="Name/path of the object in GCS")
    media_table: str = Field(..., alias="media-table", description="Type of media table")
    entity_id: str = Field(..., alias="entity-id", description="ID of the related entity")
    media_format: str = Field(..., alias="media-format", description="Format of the media")
    media_order: str = Field(..., alias="media-order", description="Order of the media")
    mime_type: str = Field(..., alias="mime-type", description="MIME type of the file")


class GCSEventData(BaseModel):
    name: str = Field(..., description="Name/path of the object in GCS")
    bucket: str = Field(..., description="Name of the GCS bucket")
    generation: str | None = Field(None, description="Object generation number")
    metageneration: str | None = Field(None, description="Object metageneration number")
    contentType: str | None = Field(None, description="Content type of the object")
    size: str | None = Field(None, description="Size of the object in bytes")
    timeCreated: str | None = Field(None, description="Object creation timestamp")
    updated: str | None = Field(None, description="Object last update timestamp")
    metadata: GCSMetadata | None = Field(None, description="Custom metadata for the object")
    kind: str | None = Field(None, description="Type of resource")
    id: str | None = Field(None, description="Resource ID")
    selfLink: str | None = Field(None, description="URL to access the resource")
    storageClass: str | None = Field(None, description="Storage class of the object")
    timeStorageClassUpdated: str | None = Field(None, description="Last storage class update time")
    md5Hash: str | None = Field(None, description="MD5 hash of the object")
    mediaLink: str | None = Field(None, description="Download URL for the object")
    crc32c: str | None = Field(None, description="CRC32c checksum")
    etag: str | None = Field(None, description="HTTP etag")
