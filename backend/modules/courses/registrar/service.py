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
        self.schedule_index_uid = SCHEDULE_INDEX_UID
        self._active_semester: SemesterOption | None = None

    async def sync_schedule(self, username: str, password: str) -> ScheduleResponse:
        async with self.client_factory() as client:
            raw = await client.fetch_schedule(username=username, password=password)
        schedule: ScheduleResponse = parse_schedule(raw)
        return schedule

    async def list_semesters(self) -> list[SemesterOption]:
        async with self.public_client_factory() as client:
            semesters = await client.get_semesters()
        return [SemesterOption(**semester) for semester in semesters]

    async def search_courses_pcc(self, request: CourseSearchRequest) -> CourseSearchResponse:
        """
        Search courses directly against the public course catalog (registrar live),
        bypassing Meilisearch schedule index. Used by course sync as a reliable source.
        """
        try:
            async with self.public_client_factory() as client:
                data = await client.search(
                    course_code=request.course_code,
                    term=request.term or "",
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

    async def get_active_semester(self) -> SemesterOption:
        """
        Return the most recent registrar semester (highest numeric value).
        Result is cached per service instance to avoid redundant HTTP calls.
        """
        if self._active_semester:
            return self._active_semester

        semesters = await self.list_semesters()
        if not semesters:
            raise HTTPException(status_code=503, detail="no_semesters_available")

        def _semester_sort_key(option: SemesterOption) -> tuple[int, str]:
            try:
                numeric_value = int(option.value)
            except (TypeError, ValueError):
                numeric_value = -1
            return (numeric_value, option.label)

        latest = max(semesters, key=_semester_sort_key)
        self._active_semester = latest
        return latest

    async def search_courses(self, request: CourseSearchRequest) -> CourseSearchResponse:
        keyword = request.course_code or ""
        active_term = await self.get_active_semester()
        items, has_next = await self._search_schedule_catalog(
            keyword=keyword,
            term=request.term,
            page=request.page,
            size=request.size,
            strict_code_match=False,
            term_label_fallback=active_term.label
        )

        if not items:
            return CourseSearchResponse(items=[], cursor=None)

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

        cursor = request.page + 1 if has_next else None
        return CourseSearchResponse(items=items, cursor=cursor)

    async def get_course_schedule(
        self,
        *,
        course_code: str,
        term: str,
    ) -> list[CourseScheduleEntry]:
        sections = await self._schedule_sections_from_index(
            course_code=course_code,
            term=term,
            )
        if sections:
            return sections
        raise HTTPException(status_code=502, detail="schedule_unavailable")

    async def _search_schedule_catalog(
        self,
        *,
        keyword: str,
        term: str | None,
        page: int,
        size: int,
        strict_code_match: bool,
        term_label_fallback: str | None = None,
    ) -> tuple[list[dict], bool]:
        page = max(page, 1)
        size = max(size, 1)

        result = await meilisearch_utils.get(
            client=self.meilisearch_client,
            storage_name=self.schedule_index_uid,
            keyword=keyword or "",
            page=page,
            size=size,
        )

        hits = result.get("hits", [])
        normalized_target = (
            self.normalize_course_code(keyword) if strict_code_match and keyword else None
        )

        summaries: list[dict] = []
        for hit in hits:
            if not self._matches_term(hit, term):
                continue
            code = hit.get("course_code") or ""
            if not code:
                continue
            if normalized_target and self.normalize_course_code(code) != normalized_target:
                continue
            summaries.append(
                self._build_course_summary_from_hit(hit, term_label_fallback=term_label_fallback)
            )

        total_hits = result.get("estimatedTotalHits")
        has_next = False
        if isinstance(total_hits, int):
            has_next = total_hits > page * size
        elif len(hits) == size:
            has_next = True

        return summaries, has_next

    async def _schedule_sections_from_index(
        self,
        *,
        course_code: str,
        term: str | None,
    ) -> list[CourseScheduleEntry]:
        result = await meilisearch_utils.get(
            client=self.meilisearch_client,
            storage_name=self.schedule_index_uid,
            keyword=course_code or "",
            page=1,
            size=5,
        )
        hits = result.get("hits", [])
        if not hits:
            result = await meilisearch_utils.get(
                client=self.meilisearch_client,
                storage_name=self.schedule_index_uid,
                keyword=course_code or "",
                page=1,
                size=5,
            )
            hits = result.get("hits", [])

        normalized_target = self.normalize_course_code(course_code)
        for hit in hits:
            if not self._matches_term(hit, term):
                continue
            code = hit.get("course_code") or ""
            if normalized_target and self.normalize_course_code(code) != normalized_target:
                continue
            return self._map_sections_from_hit(hit)
        return []

    def _map_sections_from_hit(self, hit: dict) -> list[CourseScheduleEntry]:
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

    def _build_course_summary_from_hit(
        self,
        hit: dict,
        *,
        term_label_fallback: str | None = None,
    ) -> dict:
        course_code = hit.get("course_code", "") or ""
        credits = hit.get("credits_us")
        credits_str = ""
        if credits not in (None, ""):
            credits_str = str(credits)
        term_label = (hit.get("term") or "").strip()
        if not term_label or term_label.lower() == "unknown term":
            term_label = term_label_fallback or ""
        department = hit.get("department")
        if not department:
            department = hit.get("school") or "General"
        return {
            "registrar_id": course_code,
            "course_code": course_code,
            "pre_req": "",
            "anti_req": "",
            "co_req": "",
            "level": hit.get("level") or None,
            "school": hit.get("school") or None,
            "description": None,
            "department": department,
            "title": hit.get("title") or "",
            "credits": credits_str,
            "term": term_label or "",
            "priority_1": None,
            "priority_2": None,
            "priority_3": None,
            "priority_4": None,
        }

    @staticmethod
    def _matches_term(hit: dict, term: str | None) -> bool:
        if not term:
            return True
        term_str = str(term).strip()
        hit_term_id = str(hit.get("term_id") or "").strip()
        hit_term_label = str(hit.get("term") or "").strip()
        return term_str == hit_term_id or term_str == hit_term_label


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

