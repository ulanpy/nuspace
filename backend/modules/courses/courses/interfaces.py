from __future__ import annotations

from typing import List, Protocol, Tuple

from backend.modules.courses.registrar.schemas import (
    CatalogCourse,
    ScheduleResponse,
    SemesterOption,
)


class StudentScheduleRegistrar(Protocol):
    @property
    def schedule_index_uid(self) -> str: ...

    async def sync_schedule(self, username: str, password: str) -> ScheduleResponse: ...

    async def get_active_semester(self) -> SemesterOption: ...

    async def find_catalog_course(
        self, *, course_code: str, term_value: str
    ) -> CatalogCourse | None: ...

    def parse_schedule_pdf(self, pdf_file: bytes) -> ScheduleResponse: ...


class CalendarEventSync(Protocol):
    async def sync_events(
        self,
        *,
        desired_events: List[dict],
        kc_access_token: str | None,
        kc_refresh_token: str | None,
    ) -> Tuple[int, int, int, List[str]]: ...
