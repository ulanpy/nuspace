"""
This module is named "crashed" as a tribute to the creator 
of crashed.nu — @superhooman.
GitHub: https://github.com/superhooman/crashed.nu
"""


from typing import Optional

from fastapi import APIRouter, Depends, Query

from backend.modules.courses.crashed.dependencies import (
    get_registrar_service,
    # get_registrar_username,
)
from backend.modules.courses.crashed.schemas import (
    CourseDetailResponse,
    CourseSchedulesRequest,
    CourseSchedulesResponse,
    CourseSearchRequest,
    CourseSearchResponse,
    ScheduleResponse,
    SemesterOption,
    SyncRequest,
)
from backend.modules.courses.crashed.service import RegistrarService


router = APIRouter(prefix="/registrar", tags=["Registrar"])


@router.post("/sync", response_model=ScheduleResponse)
async def sync_registrar(
    payload: SyncRequest,
    # username: str = Depends(get_registrar_username),
    service: RegistrarService = Depends(get_registrar_service),
) -> ScheduleResponse:
    return await service.sync_schedule(username='ulan.sharipov', password=payload.password)


@router.get("/semesters", response_model=list[SemesterOption])
async def list_semesters(
    service: RegistrarService = Depends(get_registrar_service),
) -> list[SemesterOption]:
    """
    List all semesters available from the registrar.
    """
    return await service.list_semesters()


@router.get("/search", response_model=CourseSearchResponse)
async def search_courses(
    term: str,
    query: str | None = None,
    level: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    service: RegistrarService = Depends(get_registrar_service),
) -> CourseSearchResponse:
    payload = CourseSearchRequest(query=query, term=term, level=level, page=page)
    return await service.search_courses(payload)


@router.get("/course/{course_id}", response_model=CourseDetailResponse)
async def course_detail(
    course_id: str,
    service: RegistrarService = Depends(get_registrar_service),
) -> CourseDetailResponse:
    return await service.get_course(course_id)


@router.post("/schedules", response_model=CourseSchedulesResponse)
async def course_schedules(
    payload: CourseSchedulesRequest,
    service: RegistrarService = Depends(get_registrar_service),
) -> CourseSchedulesResponse:
    return await service.get_course_schedules(payload)

