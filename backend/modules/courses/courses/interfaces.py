from __future__ import annotations

from typing import List, Protocol, Tuple

from backend.modules.courses.registrar.schemas import (
    CourseSearchRequest,
    CourseSearchResponse,
    ScheduleResponse,
    SemesterOption,
)


class StudentScheduleRegistrar(Protocol):
    @property
    def schedule_index_uid(self) -> str: ...

    async def sync_schedule(self, username: str, password: str) -> ScheduleResponse: ...

    async def list_semesters(self) -> list[SemesterOption]: ...

    async def search_courses_pcc(self, request: CourseSearchRequest) -> CourseSearchResponse: ...

    def parse_schedule_pdf(self, pdf_file: bytes) -> ScheduleResponse: ...


class CalendarEventSync(Protocol):
    async def sync_events(
        self,
        *,
        desired_events: List[dict],
        kc_access_token: str | None,
        kc_refresh_token: str | None,
    ) -> Tuple[int, int, int, List[str]]: ...
