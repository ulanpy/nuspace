from typing import Annotated, List

from fastapi import APIRouter, Depends, Query

from backend.common.dependencies import get_creds_or_401
from backend.modules.courses.planner.dependencies import get_planner_service
from backend.modules.courses.planner.schemas import (
    PlannerAutoBuildResponse,
    PlannerCourseAddRequest,
    PlannerCourseResponse,
    PlannerResetRequest,
    PlannerScheduleResponse,
    PlannerSectionResponse,
    PlannerSectionSelectionRequest,
)
from backend.modules.courses.planner.service import PlannerService
from backend.modules.courses.registrar.schemas import CourseSearchResponse, SemesterOption


router = APIRouter(prefix="/planner", tags=["Schedule Planner"])


@router.get(
    "/semesters",
    response_model=List[SemesterOption],
    summary="List registrar semesters for planner dropdowns",
)
async def list_semesters(
    service: PlannerService = Depends(get_planner_service),
) -> List[SemesterOption]:
    return await service.list_semesters()


@router.get(
    "/courses/search",
    response_model=CourseSearchResponse,
    summary="Search registrar courses for planner use",
)
async def search_courses_for_planner(
    principals: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    term_value: str = Query(..., min_length=1),
    course_code: str | None = Query(None, min_length=1),
    page: int = Query(1, ge=1),
    service: PlannerService = Depends(get_planner_service),
) -> CourseSearchResponse:
    _ = principals
    return await service.search_courses(
        term_value=term_value,
        course_code=course_code,
        page=page,
    )

@router.get(
    "",
    response_model=PlannerScheduleResponse,
    summary="Get planner schedule for the authenticated student",
)
async def get_planner_schedule(
    principals: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: PlannerService = Depends(get_planner_service),
) -> PlannerScheduleResponse:
    student_sub = principals[0]["sub"]
    return await service.get_schedule(student_sub)


@router.post(
    "/courses",
    response_model=PlannerCourseResponse,
    summary="Add a course to planner schedule",
)
async def add_course(
    payload: PlannerCourseAddRequest,
    principals: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: PlannerService = Depends(get_planner_service),
) -> PlannerCourseResponse:
    student_sub = principals[0]["sub"]
    return await service.add_course(student_sub=student_sub, payload=payload)


@router.delete(
    "/courses/{course_id}",
    status_code=204,
    summary="Remove a course from planner",
)
async def remove_course(
    course_id: int,
    principals: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: PlannerService = Depends(get_planner_service),
) -> None:
    student_sub = principals[0]["sub"]
    await service.remove_course(student_sub=student_sub, course_id=course_id)


@router.get(
    "/courses/{course_id}/sections",
    response_model=List[PlannerSectionResponse],
    summary="Fetch registrar sections for a planner course",
)
async def get_sections(
    course_id: int,
    principals: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: PlannerService = Depends(get_planner_service),
    refresh: bool = Query(False, description="Force refresh from registrar"),
) -> List[PlannerSectionResponse]:
    student_sub = principals[0]["sub"]
    return await service.fetch_course_sections_for_student(
        student_sub=student_sub,
        course_id=course_id,
        refresh=refresh,
    )


@router.post(
    "/courses/{course_id}/sections/select",
    response_model=PlannerCourseResponse,
    summary="Select preferred sections for a course",
)
async def select_sections(
    course_id: int,
    payload: PlannerSectionSelectionRequest,
    principals: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: PlannerService = Depends(get_planner_service),
) -> PlannerCourseResponse:
    student_sub = principals[0]["sub"]
    return await service.select_sections_for_student(
        student_sub=student_sub,
        course_id=course_id,
        section_ids=payload.section_ids,
    )


@router.post(
    "/autobuild",
    response_model=PlannerAutoBuildResponse,
    summary="Automatically build schedule",
)
async def auto_build(
    principals: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: PlannerService = Depends(get_planner_service),
) -> PlannerAutoBuildResponse:
    student_sub = principals[0]["sub"]
    return await service.auto_build_schedule(student_sub=student_sub)


@router.post(
    "/reset",
    status_code=204,
    summary="Reset planner data for the student",
)
async def reset_planner(
    payload: PlannerResetRequest,
    principals: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: PlannerService = Depends(get_planner_service),
) -> None:
    student_sub = principals[0]["sub"]
    await service.reset(student_sub=student_sub, term_value=payload.term_value)

