"""
This Registrar module is named "crashed" as a tribute to the creator 
of crashed.nu — @superhooman.
GitHub: https://github.com/superhooman/crashed.nu
"""

from fastapi import APIRouter, Depends

from backend.modules.courses.crashed.dependencies import get_registrar_service
from backend.modules.courses.crashed.schemas import (
    CourseSchedulesRequest,
    CourseSchedulesResponse,
    CourseSearchRequest,
    CourseSearchResponse,
    SemesterOption,
)
from backend.modules.courses.crashed.service import RegistrarService


router = APIRouter(prefix="/registrar", tags=["Registrar"])

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
    payload: CourseSearchRequest = Depends(),
    service: RegistrarService = Depends(get_registrar_service),
) -> CourseSearchResponse:
    return await service.search_courses(payload)


@router.post("/schedules", response_model=CourseSchedulesResponse)
async def course_schedules(
    payload: CourseSchedulesRequest,
    service: RegistrarService = Depends(get_registrar_service),
) -> CourseSchedulesResponse:
    return await service.get_course_schedules(payload)

