from typing import Any, Dict, Iterable

import httpx
from backend.modules.notion import schemas
from backend.modules.notion.schemas import DatabaseSchema

from backend.modules.notion.consts import (
    NOTION_API_BASE_URL,
    NOTION_API_VERSION,
    DEFAULT_TIMEOUT
)



class NotionClientError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None, retryable: bool = False):
        super().__init__(message)
        self.status_code = status_code
        self.retryable = retryable


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
    ) -> None:
        self.token = token
        self.timeout = timeout
        self.notion_version = notion_version

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
        schema: DatabaseSchema = await self._get_database_schema(payload.database_id, client=client)
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

    async def update_ticket_entry(
        self, page_id: str, payload: schemas.NotionTicketMessage
    ) -> dict[str, Any]:
        """
        Update an existing Notion page with new ticket data.
        
        Args:
            page_id: The Notion page ID to update (32 character identifier)
            payload: Updated ticket data
            
        Returns:
            Updated page data from Notion API
        """
        client = await self._ensure_client()
        schema: DatabaseSchema = await self._get_database_schema(payload.database_id, client=client)
        properties = self._build_properties(payload, schema)

        # Update page properties
        request_body = {"properties": properties}
        response = await client.patch(f"/pages/{page_id}", json=request_body)
        if response.status_code >= 400:
            self._handle_response_error(response)

        # Update page content (children blocks)
        updated_block_id = await self._update_page_children(
            page_id, payload, payload.notion_block_id, client=client
        )
        
        # Return response with block ID for storage
        result = response.json()
        if updated_block_id:
            result["_block_id"] = updated_block_id
        return result

    async def _update_page_children(
        self,
        page_id: str,
        payload: schemas.NotionTicketMessage,
        block_id: str | None,
        *,
        client: httpx.AsyncClient,
    ) -> str | None:
        """
        Update a specific block containing ticket content.
        
        Args:
            page_id: The Notion page ID
            payload: Updated ticket data
            block_id: The block ID to update (if None, will find the first paragraph block)
            client: HTTP client
            
        Returns:
            The block ID that was updated (for storage)
        """
        # If block_id is provided, use it; otherwise find the first paragraph block
        target_block_id = block_id
        if not target_block_id:
            target_block_id = await self._find_ticket_block(page_id, client=client)
        
        if not target_block_id:
            # Fallback: create a new block if we can't find the existing one
            children = self._build_children(payload)
            if children:
                append_body = {"children": children}
                response = await client.patch(
                    f"/blocks/{page_id}/children", json=append_body
                )
                if response.status_code >= 400:
                    self._handle_response_error(response)
                # Return the first block ID from the response
                response_data = response.json()
                results = response_data.get("results", [])
                return results[0].get("id") if results else None
            return None

        # Update the specific block
        children = self._build_children(payload)
        if not children:
            return target_block_id
        
        # Update the block content
        block_content = children[0]  # We only have one block now
        update_body = {
            "paragraph": block_content.get("paragraph", {})
        }
        
        response = await client.patch(f"/blocks/{target_block_id}", json=update_body)
        if response.status_code >= 400:
            self._handle_response_error(response)
        
        return target_block_id

    async def _find_ticket_block(
        self,
        page_id: str,
        *,
        client: httpx.AsyncClient,
    ) -> str | None:
        """
        Find the first paragraph block that contains ticket content.
        Looks for blocks containing "Ticket #" pattern.
        """
        cursor = None
        
        while True:
            params = {}
            if cursor:
                params["start_cursor"] = cursor
            
            response = await client.get(f"/blocks/{page_id}/children", params=params)
            if response.status_code >= 400:
                self._handle_response_error(response)
            
            data = response.json()
            results = data.get("results", [])
            
            # Look for the first paragraph block (our ticket content block)
            for block in results:
                if block.get("type") == "paragraph":
                    # Check if it contains ticket content
                    paragraph = block.get("paragraph", {})
                    rich_text = paragraph.get("rich_text", [])
                    content = "".join(
                        item.get("plain_text", "")
                        for item in rich_text
                    )
                    if "Ticket #" in content:
                        return block["id"]
                    # If it's the first paragraph block, use it anyway
                    if not cursor:  # First page of results
                        return block["id"]
            
            if not data.get("has_more"):
                break
            cursor = data.get("next_cursor")
        
        return None

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
                "title": [{"type": "text", "text": {"content": payload.title[:2000]}}],
            }
        }

        properties["Status"] = {"status": {"name": "SGotinish"}}

        return properties

    def _build_children(self, payload: schemas.NotionTicketMessage) -> list[dict[str, Any]]:
        def _format_enum(value: Any) -> str:
            if hasattr(value, "value"):
                value = value.value
            return str(value).replace("_", " ").title()

        content_lines = [
            f"Category: {_format_enum(payload.category)}",
            f"Status: {_format_enum(payload.ticket_status)}",
            f"Created: {payload.created_at:%Y-%m-%d %H:%M}",
        ]
        if payload.ticket_url:
            content_lines.append(f"Ticket URL: {payload.ticket_url}")
        
        content_lines.append("")  # Empty line separator
        
        if payload.is_anonymous:
            content_lines.append("Reporter")
            content_lines.append("• Anonymous ticket")
        else:
            content_lines.append("Reporter")
            content_lines.append(f"• Name: {payload.reporter_name or 'Unknown'}")
            content_lines.append(f"• Email: {payload.reporter_email or '—'}")
        
        if payload.body:
            content_lines.append("")  # Empty line separator
            content_lines.append("Description")
            content_lines.append(payload.body)

        return [self._paragraph_block("\n".join(content_lines))]

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
