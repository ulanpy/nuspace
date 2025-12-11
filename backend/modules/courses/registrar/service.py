import logging
import re
from dataclasses import dataclass
from typing import Dict, Sequence

from fastapi import HTTPException
from httpx import AsyncClient

from backend.common.utils import meilisearch as meilisearch_utils
from backend.modules.courses.registrar.schemas import (
    CourseScheduleEntry,
    CourseSearchRequest,
    CourseSearchResponse,
    ScheduleResponse,
    SemesterOption,
)
from backend.modules.courses.registrar.clients.registrar_client import RegistrarClient
from backend.modules.courses.registrar.parsers.registrar_parser import parse_schedule
from backend.modules.courses.registrar.clients.public_course_catalog import (
    PublicCourseCatalogClient,
)
from backend.modules.courses.registrar.priority_sync import PRIORITY_INDEX_UID
from backend.modules.courses.registrar.schedule_sync import SCHEDULE_INDEX_UID


@dataclass
class CoursePriorityRecord:
    prerequisite: str | None = None
    corequisite: str | None = None
    antirequisite: str | None = None
    priority_1: str | None = None
    priority_2: str | None = None
    priority_3: str | None = None
    priority_4: str | None = None

class RegistrarService:
    """
    Service for synchronizing student schedules from NU registrar system.
    
    Provides high-level interface for fetching and processing schedule data.
    Uses dependency injection for client factory to enable testing and
    different client implementations.
    
    Args:
        client_factory: Factory function for creating registrar clients (default: RegistrarClient)
    """
    def __init__(
        self,
        client_factory=RegistrarClient,
        public_client_factory=PublicCourseCatalogClient,
        *,
        meilisearch_client: AsyncClient | None = None,
        priority_index_uid: str = PRIORITY_INDEX_UID,
    ) -> None:
        self.client_factory = client_factory
        self.public_client_factory = public_client_factory
        self.meilisearch_client = meilisearch_client
        self.priority_index_uid = priority_index_uid

    async def sync_schedule(self, username: str, password: str) -> ScheduleResponse:
        async with self.client_factory() as client:
            raw = await client.fetch_schedule(username=username, password=password)
        schedule: ScheduleResponse = parse_schedule(raw)
        return schedule

    async def list_semesters(self) -> list[SemesterOption]:
        async with self.public_client_factory() as client:
            semesters = await client.get_semesters()
        return [SemesterOption(**semester) for semester in semesters]

    async def search_courses(self, request: CourseSearchRequest) -> CourseSearchResponse:
        try:
            async with self.public_client_factory() as client:
                data = await client.search(
                    course_code=request.course_code,
                    term=request.term,
                    page=request.page,
                )
        except ValueError as exc:  # registrar returned non-JSON payload
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        items = data.get("items", [])
        priority_map = await self.fetch_course_priorities(
            [item.get("course_code") for item in items]
        )

        for item in items:
            normalized = self.normalize_course_code(item.get("course_code"))
            priority_record = priority_map.get(normalized)
            if not priority_record:
                item.setdefault("priority_1", None)
                item.setdefault("priority_2", None)
                item.setdefault("priority_3", None)
                item.setdefault("priority_4", None)
                continue

            item["priority_1"] = priority_record.priority_1
            item["priority_2"] = priority_record.priority_2
            item["priority_3"] = priority_record.priority_3
            item["priority_4"] = priority_record.priority_4

            if not item.get("pre_req"):
                item["pre_req"] = priority_record.prerequisite or ""
            if not item.get("co_req"):
                item["co_req"] = priority_record.corequisite or ""
            if not item.get("anti_req"):
                item["anti_req"] = priority_record.antirequisite or ""

        # If PCC returned results, return them
        if items:
            return CourseSearchResponse(**data)

        # Fallback: search schedule catalog in Meilisearch by keyword (code/title)
        if request.course_code and self.meilisearch_client:
            fallback_items = await self._fallback_search_schedule_catalog_by_keyword(
                keyword=request.course_code,
                term=request.term,
            )
            if fallback_items:
                return CourseSearchResponse(items=fallback_items, cursor=None)

        return CourseSearchResponse(items=[], cursor=None)

    async def get_course_schedule(
        self,
        *,
        course_id: str,
        term: str,
    ) -> list[CourseScheduleEntry]:
        sections: list[dict] = []
        # Try PCC first; if it fails or returns empty, fall back to catalog.
        try:
            async with self.public_client_factory() as client:
                sections = await client.get_schedules(course_id, term)
        except Exception:
            sections = []

        parsed = self._parse_pcc_sections(sections) if sections else []
        if parsed:
            return parsed

        # Fallback to catalog if PCC schedule is empty or errored
        if self.meilisearch_client:
            fallback_sections = await self._fallback_schedule_sections(
                course_code=course_id, term=term
            )
            if fallback_sections:
                return fallback_sections

        raise HTTPException(status_code=502, detail="schedule_unavailable")

    def _parse_pcc_sections(self, sections: list[dict]) -> list[CourseScheduleEntry]:
        parsed: list[CourseScheduleEntry] = []
        for section in sections:
            capacity_raw = section.get("CAPACITY")
            try:
                capacity = int(capacity_raw) if capacity_raw not in (None, "") else None
            except (TypeError, ValueError):
                capacity = None
            enrollment_raw = section.get("ENR")
            try:
                enrollment = int(enrollment_raw) if enrollment_raw not in (None, "") else None
            except (TypeError, ValueError):
                enrollment = None

            parsed.append(
                CourseScheduleEntry(
                    section_code=section.get("ST", "") or section.get("SECTIONID", ""),
                    days=section.get("DAYS", "") or "",
                    times=section.get("TIMES", "") or "",
                    room=section.get("ROOM"),
                    faculty=(section.get("FACULTY") or "").replace("<br>", "; ").strip() or None,
                    capacity=capacity,
                    enrollment=enrollment,
                    instance_id=section.get("INSTANCEID"),
                )
            )
        return parsed

    async def _fallback_search_schedule_catalog(
        self, course_code: str, term: str | None
    ) -> list[dict]:
        """
        Search the Meilisearch-backed XLS catalog when PCC misses a course.
        Returns list of CourseSummary-compatible dicts.
        """
        if not self.meilisearch_client:
            return []

        keyword = course_code
        filters = []
        if term:
            filters.append(f'term_id = "{term}"')

        result = await meilisearch_utils.get(
            client=self.meilisearch_client,
            storage_name=SCHEDULE_INDEX_UID,
            keyword=keyword,
            filters=filters or None,
            page=1,
            size=5,
        )
        hits = result.get("hits", [])
        if not hits and filters:
            # Retry without filters in case term labels differ
            result = await meilisearch_utils.get(
                client=self.meilisearch_client,
                storage_name=SCHEDULE_INDEX_UID,
                keyword=keyword,
                page=1,
                size=5,
            )
            hits = result.get("hits", [])

        summaries: list[dict] = []
        for hit in hits:
            code = hit.get("course_code") or ""
            normalized = self.normalize_course_code(code)
            if normalized != self.normalize_course_code(course_code):
                continue
            summaries.append(
                {
                    "registrar_id": hit.get("course_code", ""),
                    "course_code": hit.get("course_code", ""),
                    "pre_req": "",
                    "anti_req": "",
                    "co_req": "",
                    "level": hit.get("level", "") or "",
                    "school": hit.get("school", "") or "",
                    "description": "",
                    "department": "",
                    "title": hit.get("title", "") or "",
                    "credits": str(hit.get("credits_us", "") or ""),
                    "term": hit.get("term", "") or "",
                    "priority_1": None,
                    "priority_2": None,
                    "priority_3": None,
                    "priority_4": None,
                }
            )
        return summaries

    async def _fallback_search_schedule_catalog_by_keyword(
        self, keyword: str, term: str | None
    ) -> list[dict]:
        """
        Fallback search against the schedule catalog by arbitrary keyword
        (course code or title). Returns CourseSummary-compatible dicts.
        """
        if not self.meilisearch_client:
            return []

        filters = []
        if term:
            filters.append(f'term_id = "{term}"')

        result = await meilisearch_utils.get(
            client=self.meilisearch_client,
            storage_name=SCHEDULE_INDEX_UID,
            keyword=keyword,
            filters=filters or None,
            page=1,
            size=10,
        )
        hits = result.get("hits", [])
        if not hits and filters:
            result = await meilisearch_utils.get(
                client=self.meilisearch_client,
                storage_name=SCHEDULE_INDEX_UID,
                keyword=keyword,
                page=1,
                size=10,
            )
            hits = result.get("hits", [])

        summaries: list[dict] = []
        for hit in hits:
            summaries.append(
                {
                    "registrar_id": hit.get("course_code", ""),
                    "course_code": hit.get("course_code", ""),
                    "pre_req": "",
                    "anti_req": "",
                    "co_req": "",
                    "level": hit.get("level", "") or "",
                    "school": hit.get("school", "") or "",
                    "description": "",
                    "department": "",
                    "title": hit.get("title", "") or "",
                    "credits": str(hit.get("credits_us", "") or ""),
                    "term": hit.get("term", "") or "",
                    "priority_1": None,
                    "priority_2": None,
                    "priority_3": None,
                    "priority_4": None,
                }
            )
        return summaries

    async def _fallback_schedule_sections(
        self, course_code: str, term: str | None
    ) -> list[CourseScheduleEntry]:
        if not self.meilisearch_client:
            return []

        keyword = course_code
        filters = []
        if term:
            filters.append(f'term_id = "{term}"')

        result = await meilisearch_utils.get(
            client=self.meilisearch_client,
            storage_name=SCHEDULE_INDEX_UID,
            keyword=keyword,
            filters=filters or None,
            page=1,
            size=1,
        )
        hits = result.get("hits", [])
        if not hits and filters:
            result = await meilisearch_utils.get(
                client=self.meilisearch_client,
                storage_name=SCHEDULE_INDEX_UID,
                keyword=keyword,
                page=1,
                size=1,
            )
            hits = result.get("hits", [])

        if not hits:
            return []

        hit = hits[0]
        code = hit.get("course_code") or ""
        if self.normalize_course_code(code) != self.normalize_course_code(course_code):
            return []

        sections = hit.get("sections", []) or []
        parsed: list[CourseScheduleEntry] = []
        for sec in sections:
            parsed.append(
                CourseScheduleEntry(
                    section_code=sec.get("section_code", ""),
                    days=sec.get("days", ""),
                    times=sec.get("time", ""),
                    room=sec.get("room"),
                    faculty=sec.get("faculty"),
                    capacity=_coerce_int(sec.get("capacity")),
                    enrollment=_coerce_int(sec.get("enrollment")),
                    instance_id=None,
                )
            )
        return parsed

    async def fetch_course_priorities(
        self,
        course_codes: Sequence[str],
    ) -> Dict[str, CoursePriorityRecord]:
        """Fetch registrar priority metadata for the provided course codes."""
        if not course_codes or not self.meilisearch_client:
            return {}

        cache: Dict[str, CoursePriorityRecord | None] = {}
        results: Dict[str, CoursePriorityRecord] = {}

        for course_code in course_codes:
            normalized = self.normalize_course_code(course_code)
            if not normalized or normalized in cache:
                if normalized and cache.get(normalized):
                    results[normalized] = cache[normalized]  # type: ignore[assignment]
                continue

            record = await self._fetch_priority_record(course_code, normalized)
            cache[normalized] = record
            if record:
                results[normalized] = record

        return results

    async def _fetch_priority_record(
        self,
        course_code: str | None,
        normalized: str,
    ) -> CoursePriorityRecord | None:
        if not course_code or not self.meilisearch_client:
            return None

        keyword = course_code.strip()

        try:
            result = await meilisearch_utils.get(
                client=self.meilisearch_client,
                storage_name=self.priority_index_uid,
                keyword=keyword or course_code,
                page=1,
                size=5,
            )
        except Exception as exc:
            return None

        hits = result.get("hits", [])
        match = next(
            (
                hit
                for hit in hits
                if self.normalize_course_code(hit.get("abbr")) == normalized
            ),
            None,
        )

        if not match:
            return None

        return CoursePriorityRecord(
            prerequisite=match.get("prerequisite"),
            corequisite=match.get("corequisite"),
            antirequisite=match.get("antirequisite"),
            priority_1=match.get("priority_1"),
            priority_2=match.get("priority_2"),
            priority_3=match.get("priority_3"),
            priority_4=match.get("priority_4"),
        )

    @staticmethod
    def normalize_course_code(value: str | None) -> str:
        if not value:
            return ""
        normalized = re.sub(r"\s+", " ", value).strip().upper()
        normalized = re.sub(r"\s*/\s*", "/", normalized)
        normalized = normalized.replace("-", "").replace(" ", "")
        return normalized


def _coerce_int(val):
    try:
        if val in (None, ""):
            return None
        return int(val)
    except (TypeError, ValueError):
        return None

