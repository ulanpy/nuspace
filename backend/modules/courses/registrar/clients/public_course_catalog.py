"""Public Course Catalog client mirroring crashed.nu PCC logic."""

from __future__ import annotations

from collections.abc import Iterable
import json
from typing import Any, Dict, List, Optional

import httpx



PCC_HOST = "https://registrar.nu.edu.kz/my-registrar/public-course-catalog/json"



class PublicCourseCatalogClient:
    """Async client for NU public course catalog endpoints."""

    def __init__(
        self,
        *,
        verify_ssl: bool = False,
        timeout: float = 30.0,
        limit: int = 50,
    ) -> None:
        self.verify_ssl = verify_ssl
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None
        if limit <= 0:
            raise ValueError("limit must be a positive integer")
        self._limit = limit
        self._default_term: str | None = None

    async def __aenter__(self) -> "PublicCourseCatalogClient":
        await self._ensure_client()
        return self

    async def __aexit__(self, exc_type, exc_value, traceback) -> None:  # type: ignore[override]
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                verify=self.verify_ssl,
            )
        return self._client

    async def _request(self, method: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """Helper function to send requests to the public course catalog endpoint."""
        client = await self._ensure_client()
        if params is not None:
            payload = {
                **params,
                "method": method,
            }
            response = await client.post(
                PCC_HOST,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        else:
            response = await client.get(
                PCC_HOST,
                params={"method": method},
            )
        response.raise_for_status()
        try:
            return response.json()
        except json.JSONDecodeError as exc:  # pragma: no cover - defensive
            text = response.text.strip()
            snippet = text[:200]
            raise ValueError(
                f"Registrar returned non-JSON payload for method '{method}': {snippet}"
            ) from exc


    async def get_semesters(self) -> List[Dict[str, str]]:
        semesters = await self._request("getSemesters")
        return [
            {"label": entry["NAME"], "value": entry["ID"]}
            for entry in semesters
        ]


    async def get_schedules(
        self,
        course_id: str,
        term: str,
    ) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {
            "courseId": course_id,
            "termId": term,
        }
        result = await self._request("getSchedule", params=params)

        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            for key in ("data", "schedule", "rows"):
                value = result.get(key)
                if isinstance(value, list):
                    return value
        return []

