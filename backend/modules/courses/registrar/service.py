from fastapi import HTTPException

from backend.modules.courses.registrar.schemas import (
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
    ) -> None:
        self.client_factory = client_factory
        self.public_client_factory = public_client_factory

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
                    level=request.level,
                    page=request.page,
                )
        except ValueError as exc:  # registrar returned non-JSON payload
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        return CourseSearchResponse(**data)

