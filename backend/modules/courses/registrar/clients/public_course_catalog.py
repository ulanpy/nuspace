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
        limit: int = 10,
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


    async def search(
        self,
        course_code: str | None,
        term: str,
        level: str | None = None,
        page: int = 1,
    ) -> Dict[str, Any]:

        params: Dict[str, Any] = {
            "searchParams[formSimple]": "false",
            "searchParams[limit]": self._limit,
            "searchParams[page]": page,
            "searchParams[start]": 0,
            "searchParams[quickSearch]": course_code if course_code else "",
            "searchParams[sortField]": -1,
            "searchParams[sortDescending]": -1,
            "searchParams[semester]": term if term else "",
            "searchParams[schools]": "",
            "searchParams[departments]": "",
            "searchParams[subjects]": "",
            "searchParams[instructors]": "",
            "searchParams[breadths]": "",
            "searchParams[abbrNum]": "",
            "searchParams[credit]": "",
        }

        if level:
            params["searchParams[levels][]"] = level

        result = await self._request("getSearchData", params=params)

        raw_items = result.get("data", [])
        items: List[Dict[str, Any]] = []
        
        for entry in raw_items:
            items.append(
                {
                    "registrar_id": entry.get("COURSEID", ""),
                    "course_code": entry.get("ABBR", ""),
                    "pre_req": entry.get("PREREQ", ""),
                    "anti_req": entry.get("ANTIREQ", ""),
                    "co_req": entry.get("COREQ", ""),
                    "level": entry.get("ACADEMICLEVEL", ""),
                    "school": entry.get("SCHOOLABBR", ""),
                    "description": entry.get("SHORTDESC") or None,
                    "department": entry.get("DEPARTMENT", ""),
                    "title": entry.get("TITLE", ""),
                    "credits": entry.get("CRECTS", ""),
                    "term": entry.get("TERMNAME", ""),
                }
            )

        total_raw = result.get("total", 0)
        try:
            total = int(total_raw)
        except (TypeError, ValueError):
            total = 0
        has_next_page = total > page * self._limit

        payload: Dict[str, Any] = {"items": items}
        if has_next_page:
            payload["cursor"] = page + 1
        return payload

 