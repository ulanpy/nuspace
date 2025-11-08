from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Iterable

import httpx

from backend.core.configs.config import config
from backend.modules.notion import schemas


NOTION_API_BASE_URL = "https://api.notion.com/v1"
NOTION_API_VERSION = "2025-09-03"  # Modern API version - uses data_sources for schema
DEFAULT_TIMEOUT = 15.0

DEFAULT_PROPERTY_MAP: Dict[str, str] = {
    "status": "Status",
    "category": "Category",
    "author_sub": "Author",
    "ticket_id": "Ticket ID",
    "is_anonymous": "Anonymous",
    "created_at": "Created At",
    "updated_at": "Updated At",
    "ticket_url": "Ticket URL",
}


class NotionClientError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None, retryable: bool = False):
        super().__init__(message)
        self.status_code = status_code
        self.retryable = retryable


@dataclass(frozen=True)
class DatabaseSchema:
    title_property: str
    properties: Dict[str, Dict[str, Any]]


class NotionClient:
    """
    Lightweight async client for interacting with Notion pages.
    """

    def __init__(
        self,
        *,
        token: str,
        timeout: float = DEFAULT_TIMEOUT,
        notion_version: str = NOTION_API_VERSION,
        property_map: Dict[str, str] | None = None,
    ) -> None:
        self.token = token
        self.timeout = timeout
        self.notion_version = notion_version
        custom_map = property_map or getattr(config, "NOTION_TICKET_PROPERTY_MAP", {})
        if not isinstance(custom_map, dict):
            custom_map = {}
        self.property_map = {**DEFAULT_PROPERTY_MAP, **custom_map}

        self._client: httpx.AsyncClient | None = None
        self._schema_cache: Dict[str, DatabaseSchema] = {}

    async def __aenter__(self) -> "NotionClient":
        await self._ensure_client()
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Notion-Version": self.notion_version,
                "Content-Type": "application/json",
            }
            self._client = httpx.AsyncClient(
                base_url=NOTION_API_BASE_URL,
                timeout=self.timeout,
                headers=headers,
            )
        return self._client

    async def create_ticket_entry(self, payload: schemas.NotionTicketMessage) -> dict[str, Any]:
        client = await self._ensure_client()
        schema = await self._get_database_schema(payload.database_id, client=client)
        properties = self._build_properties(payload, schema)
        children = self._build_children(payload)

        request_body = {
            "parent": {"database_id": payload.database_id},
            "properties": properties,
        }
        if children:
            request_body["children"] = children

        response = await client.post("/pages", json=request_body)
        if response.status_code >= 400:
            self._handle_response_error(response)
        return response.json()

    async def _get_database_schema(
        self,
        database_id: str,
        *,
        client: httpx.AsyncClient,
    ) -> DatabaseSchema:
        if database_id in self._schema_cache:
            return self._schema_cache[database_id]

        # Get database info to retrieve data_source_id (2025-09-03 API)
        response = await client.get(f"/databases/{database_id}")
        if response.status_code >= 400:
            self._handle_response_error(response)

        db_payload = response.json()
        data_sources = db_payload.get("data_sources", [])
        
        if not data_sources:
            raise NotionClientError(
                "Database has no data sources. Cannot determine schema.",
                retryable=False,
            )
        
        # Use the first data source
        data_source_id = data_sources[0].get("id")
        if not data_source_id:
            raise NotionClientError(
                "Data source missing ID in database response.",
                retryable=False,
            )
        
        # Query data source for properties (2025-09-03 API)
        ds_response = await client.get(f"/data_sources/{data_source_id}")
        if ds_response.status_code >= 400:
            self._handle_response_error(ds_response)
        
        ds_payload = ds_response.json()
        properties = ds_payload.get("properties", {})
        
        if not properties:
            raise NotionClientError(
                "Data source has no properties. Cannot determine schema.",
                retryable=False,
            )
        
        title_property = self._extract_title_property(properties)
        schema = DatabaseSchema(title_property=title_property, properties=properties)
        self._schema_cache[database_id] = schema
        return schema

    @staticmethod
    def _extract_title_property(properties: Dict[str, Dict[str, Any]]) -> str:
        for name, meta in properties.items():
            if meta.get("type") == "title":
                return name
        raise NotionClientError("Notion database is missing a title property", retryable=False)

    def _build_properties(
        self,
        payload: schemas.NotionTicketMessage,
        schema: DatabaseSchema,
    ) -> Dict[str, Any]:
        properties: Dict[str, Any] = {
            schema.title_property: {
                "title": [{"text": {"content": payload.title[:2000]}}],
            }
        }

        mapped_fields = {
            "status": payload.status,
            "category": payload.category,
            "author_sub": payload.author_sub if not payload.is_anonymous else "Anonymous",
            "ticket_id": payload.ticket_id,
            "is_anonymous": payload.is_anonymous,
            "created_at": payload.created_at,
            "updated_at": payload.updated_at,
            "ticket_url": payload.ticket_url,
        }

        for field_name, value in mapped_fields.items():
            if value is None:
                continue

            property_name = self.property_map.get(field_name)
            if not property_name:
                continue

            meta = schema.properties.get(property_name)
            if not meta:
                continue

            property_payload = self._build_property_value(meta, value)
            if property_payload is not None:
                properties[property_name] = property_payload

        return properties

    def _build_children(self, payload: schemas.NotionTicketMessage) -> list[dict[str, Any]]:
        children: list[dict[str, Any]] = []

        metadata_lines: list[str] = []
        metadata_lines.append(f"Ticket ID: {payload.ticket_id}")
        if payload.status:
            metadata_lines.append(f"Status: {payload.status}")
        if payload.category:
            metadata_lines.append(f"Category: {payload.category}")
        metadata_lines.append(f"Anonymous: {'Yes' if payload.is_anonymous else 'No'}")
        if payload.author_sub and not payload.is_anonymous:
            metadata_lines.append(f"Author: {payload.author_sub}")
        metadata_lines.append(f"Created At: {payload.created_at.isoformat()}")
        metadata_lines.append(f"Updated At: {payload.updated_at.isoformat()}")
        if payload.ticket_url:
            metadata_lines.append(f"Ticket URL: {payload.ticket_url}")

        for line in metadata_lines:
            children.append(self._paragraph_block(line))

        if payload.body:
            for paragraph in self._chunk_text(payload.body):
                children.append(self._paragraph_block(paragraph))

        return children

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 1800) -> Iterable[str]:
        for raw_paragraph in text.splitlines() or [text]:
            paragraph = raw_paragraph.strip()
            if not paragraph:
                yield ""
                continue
            start = 0
            while start < len(paragraph):
                yield paragraph[start : start + chunk_size]
                start += chunk_size

    @staticmethod
    def _paragraph_block(content: str) -> dict[str, Any]:
        rich_text = [{"type": "text", "text": {"content": content or " "}}]
        return {
            "object": "block",
            "type": "paragraph",
            "paragraph": {"rich_text": rich_text},
        }

    @staticmethod
    def _build_property_value(meta: Dict[str, Any], value: Any) -> Dict[str, Any] | None:
        property_type = meta.get("type")
        if property_type == "select":
            if not value:
                return None
            return {"select": {"name": str(value)}}
        if property_type == "multi_select":
            if not value:
                return None
            if isinstance(value, (list, tuple, set)):
                options = [{"name": str(item)} for item in value]
            else:
                options = [{"name": str(value)}]
            return {"multi_select": options}
        if property_type == "rich_text":
            if value is None:
                return None
            return {"rich_text": [{"text": {"content": str(value)[:2000]}}]}
        if property_type == "checkbox":
            return {"checkbox": bool(value)}
        if property_type == "number":
            if value is None:
                return None
            try:
                return {"number": float(value)}
            except (TypeError, ValueError):
                return None
        if property_type == "date":
            if value is None:
                return None
            if isinstance(value, datetime):
                start = value.isoformat()
            else:
                start = str(value)
            return {"date": {"start": start}}
        if property_type == "url":
            if not value:
                return None
            return {"url": str(value)}
        return None

    @staticmethod
    def _handle_response_error(response: httpx.Response) -> None:
        retryable_statuses = {408, 425, 429, 500, 502, 503, 504}
        message = NotionClient._extract_error_message(response)
        retryable = response.status_code in retryable_statuses
        raise NotionClientError(
            message or f"Notion API error: {response.status_code}",
            status_code=response.status_code,
            retryable=retryable,
        )

    @staticmethod
    def _extract_error_message(response: httpx.Response) -> str | None:
        try:
            payload = response.json()
        except ValueError:
            return response.text
        return payload.get("message") or payload.get("error")
