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

    @staticmethod
    def _merge_schedules(schedules: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
        merged: Dict[str, Dict[str, Any]] = {}
        for schedule in schedules:
            key = schedule["st"]
            existing = merged.get(key)
            if existing is None:
                merged[key] = schedule
                continue
            existing["days"] += schedule["days"]
            if schedule["room"] and schedule["room"] not in existing["room"]:
                existing["room"] = f"{existing['room']} / {schedule['room']}".strip()
        return list(merged.values())

    async def get_semesters(self) -> List[Dict[str, str]]:
        semesters = await self._request("getSemesters")
        return [
            {"label": entry["NAME"], "value": entry["ID"]}
            for entry in semesters
        ]

    async def _get_default_term(self) -> str | None:
        if self._default_term is not None:
            return self._default_term

        semesters = await self.get_semesters()
        if not semesters:
            return None
        self._default_term = semesters[0]["value"]
        return self._default_term

    async def search(
        self,
        query: str | None,
        term: str,
        level: str | None = None,
        page: int = 1,
    ) -> Dict[str, Any]:

        params: Dict[str, Any] = {
            "searchParams[formSimple]": "false",
            "searchParams[limit]": self._limit,
            "searchParams[page]": page,
            "searchParams[start]": 0,
            "searchParams[quickSearch]": query if query else "",
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

    async def get_course(self, course_id: str) -> Dict[str, Any]:
        data = await self._request(
            "getCourseDescription",
            params={"courseid": course_id},
        )
        return {
            "registrar_id": data.get("COURSEID", ""),
            "course_code": data.get("ABBR", ""),
            "pre_req": data.get("PREREQ", ""),
            "anti_req": data.get("ANTIREQ", ""),
            "co_req": data.get("COREQ", ""),
            "level": data.get("ACADEMICLEVEL", ""),
            "school": data.get("SCHOOLABBR", ""),
            "description": data.get("SHORTDESC") or None,
            "department": data.get("DEPARTMENT", ""),
            "title": data.get("TITLE", ""),
            "credits": data.get("CRECTS", ""),
            "term": data.get("TERMNAME", ""),
        }

    async def get_schedules(self, course_id: str, term: str) -> List[Dict[str, Any]]:
        schedules = await self._request(
            "getSchedule",
            params={
                "termId": term,
                "courseId": course_id,
            },
        )

        processed = [
            {
                "capacity": schedule.get("CAPACITY", ""),
                "days": schedule.get("DAYS", ""),
                "enr": schedule.get("ENR", 0),
                "faculty": (schedule.get("FACULTY", "") or "").replace("<br>", "; "),
                "final_exam": schedule.get("FINALEXAM", False),
                "id": schedule.get("INSTANCEID", ""),
                "room": schedule.get("ROOM", ""),
                "st": schedule.get("ST", ""),
                "times": schedule.get("TIMES", ""),
            }
            for schedule in schedules
        ]

        return self._merge_schedules(processed)

    async def get_schedules_for_ids(self, course_ids: Iterable[str], term: str) -> Dict[str, List[Dict[str, Any]]]:
        results: Dict[str, List[Dict[str, Any]]] = {}
        for course_id in course_ids:
            results[course_id] = await self.get_schedules(course_id, term)
        return results

