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


logger = logging.getLogger(__name__)


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

        return CourseSearchResponse(**data)

    async def get_course_schedule(
        self,
        *,
        course_id: str,
        term: str,
    ) -> list[CourseScheduleEntry]:
        try:
            async with self.public_client_factory() as client:
                sections = await client.get_schedules(course_id, term)
        except ValueError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

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
                    final_exam=bool(section.get("FINALEXAM", False)),
                    instance_id=section.get("INSTANCEID"),
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
            logger.warning("Failed to fetch priority info for %s: %s", course_code, exc)
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
            logger.debug(
                "Course priority record not found for %s (normalized=%s)", course_code, normalized
            )
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

