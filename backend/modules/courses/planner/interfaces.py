from __future__ import annotations

from typing import Dict, Protocol

from backend.modules.courses.registrar.schemas import (
    CourseScheduleEntry,
    CourseSearchRequest,
    CourseSearchResponse,
)
from backend.modules.courses.registrar.service import CoursePriorityRecord


class CourseCatalogLookup(Protocol):
    async def search_courses(self, request: CourseSearchRequest) -> CourseSearchResponse: ...

    async def get_course_schedule(
        self,
        course_code: str,
        term: str,
    ) -> list[CourseScheduleEntry]: ...

    async def fetch_course_priorities(
        self, course_codes: list[str]
    ) -> Dict[str, CoursePriorityRecord]: ...

    def normalize_course_code(self, value: str | None) -> str: ...

    def course_codes_match(self, left: str | None, right: str | None) -> bool: ...
