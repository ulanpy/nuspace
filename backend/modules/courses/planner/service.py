from __future__ import annotations

from typing import Dict, Iterable, List, Optional, Sequence

from fastapi import HTTPException

from backend.modules.courses.planner.autobuilder import PlannerAutoBuilder
from backend.modules.courses.planner.repository import PlannerRepository
from backend.modules.courses.planner.schemas import (
    AutoBuildCourseResult,
    PlannerAutoBuildResponse,
    PlannerCourseAddRequest,
    PlannerCourseResponse,
    PlannerCourseSearchResponse,
    PlannerCourseSearchResult,
    PlannerSectionResponse,
    PlannerScheduleResponse,
)
from backend.modules.courses.planner.serializers import PlannerSerializer
from backend.modules.courses.registrar.schemas import (
    CourseSummary,
    CourseSearchRequest,
    CourseSearchResponse,
    SemesterOption,
)
from backend.modules.courses.registrar.service import CoursePriorityRecord, RegistrarService

from backend.core.database.models.grade_report import (
    PlannerSchedule,
    PlannerScheduleCourse,
    PlannerScheduleSection,
)


class PlannerService:
    def __init__(
        self,
        repository: PlannerRepository,
        registrar_service: RegistrarService,
    ):
        self.repository = repository
        self.registrar_service = registrar_service
        self.autobuilder = PlannerAutoBuilder()
        self.serializer = PlannerSerializer(registrar_service)
        self._active_semester: SemesterOption | None = None

    async def _get_or_create_schedule(self, student_sub: str) -> PlannerSchedule:
        schedule = await self.repository.get_schedule_for_student(student_sub)
        if schedule is None:
            schedule = await self.repository.create_schedule(
                student_sub=student_sub,
            )
            await self.repository.session.commit()
            schedule = await self.repository.get_schedule_for_student(student_sub)
        return schedule

    async def get_schedule(self, student_sub: str) -> PlannerScheduleResponse:
        schedule: PlannerSchedule = await self._get_or_create_schedule(student_sub)
        return await self._serialize_schedule_with_counts(schedule)

    async def refresh_all_courses(self, student_sub: str) -> PlannerScheduleResponse:
        schedule = await self._get_or_create_schedule(student_sub)
        for course in schedule.courses:
            await self._fetch_course_sections(
                student_sub=student_sub,
                course=course,
                refresh=True,
            )
        refreshed = await self._get_or_create_schedule(student_sub)
        return await self._serialize_schedule_with_counts(refreshed)

    async def list_semesters(self) -> List[SemesterOption]:
        active = await self._get_active_semester()
        return [active]

    async def search_courses(
        self,
        *,
        term_value: str,
        course_code: Optional[str],
        size: int,
        page: int,
    ) -> PlannerCourseSearchResponse:
        _ = term_value  # Planner is locked to the active registrar term.
        active_term = await self._get_active_semester()
        request = CourseSearchRequest(
            course_code=course_code,
            term=active_term.value,
            page=page,
            size=size,
        )
        registrar_response = await self.registrar_service.search_courses(request)
        return self._build_planner_search_response(registrar_response)

    async def reset(
        self,
        *,
        student_sub: str,
        term_value: Optional[str],
    ) -> None:
        resolved_term = term_value or (await self._get_active_semester()).value
        await self.repository.reset_student(student_sub, resolved_term)
        await self.repository.session.commit()

    # ----- Course management ----- #
    async def add_course(
        self,
        *,
        student_sub: str,
        payload: PlannerCourseAddRequest,
    ) -> PlannerCourseResponse:
        schedule = await self._get_or_create_schedule(student_sub)
        active_term = await self._get_active_semester()
        summary: CourseSummary | None = await self._find_course_summary(
            course_code=payload.course_code,
            term_value=active_term.value,
        )
        if summary is None:
            raise HTTPException(
                status_code=404,
                detail="Course not found in registrar catalog",
            )

        level = summary.level or payload.level
        course = await self.repository.add_course_to_planner_schedule(
            schedule_id=schedule.id,
            registrar_course_id=summary.registrar_id,
            course_code=summary.course_code,
            level=level,
            school=summary.school or None,
            term_value=active_term.value,
            term_label=summary.term or payload.term_label or active_term.label,
        )
        await self.repository.session.commit()

        course = await self.repository.get_course(course.id, student_sub)
        return await self._serialize_course_with_counts(course)

    async def remove_course(
        self,
        *,
        student_sub: str,
        course_id: int,
    ) -> None:
        course = await self.repository.get_course(course_id, student_sub)
        if course is None:
            raise HTTPException(status_code=404, detail="Course not found")

        await self.repository.delete_course(course)
        await self.repository.session.commit()

    async def _fetch_course_sections(
        self,
        *,
        student_sub: str,
        course: PlannerScheduleCourse,
        refresh: bool = False,
    ) -> List[PlannerSectionResponse]:
        active_term = await self._get_active_semester()
        term_value = active_term.value
        if course.term_value != term_value:
            course.term_value = term_value
            course.term_label = active_term.label

        if refresh or not course.sections:
            registrar_sections = await self.registrar_service.get_course_schedule(
                course_code=course.course_code,
                term=term_value,
            )
            payload = [
                {
                    "section_code": entry.section_code,
                    "days": entry.days,
                    "times": entry.times,
                    "room": entry.room,
                    "faculty": entry.faculty,
                    "capacity": entry.capacity,
                    "enrollment": entry.enrollment,
                }
                for entry in registrar_sections
            ]
            new_sections = await self.repository.replace_sections(
                course=course,
                sections_payload=payload,
            )
            capacity_total = self._calculate_capacity_total(new_sections)
            enrollment_total = self._calculate_enrollment_total(new_sections)
            await self.repository.update_course_capacity(
                course_id=course.id,
                capacity_total=capacity_total,
                enrollment_total=enrollment_total,
            )
            await self.repository.session.commit()
            course = await self.repository.get_course(course.id, student_sub)

        selection_counts = await self.repository.get_selection_counts_for_courses([course.id])
        counts = selection_counts.get(course.id, {})
        return [
            self.serializer.serialize_section(
                section,
                counts.get(section.section_code, 0),
            )
            for section in course.sections
        ]

    async def fetch_course_sections_for_student(
        self,
        *,
        student_sub: str,
        course_id: int,
        refresh: bool = False,
    ) -> List[PlannerSectionResponse]:
        course = await self._get_course_for_student(
            student_sub=student_sub,
            course_id=course_id,
        )
        return await self._fetch_course_sections(
            student_sub=student_sub,
            course=course,
            refresh=refresh,
        )

    async def _select_sections(
        self,
        *,
        student_sub: str,
        course: PlannerScheduleCourse,
        section_ids: Sequence[int],
    ) -> PlannerCourseResponse:
        await self.repository.select_sections(course_id=course.id, section_ids=section_ids)
        await self.repository.session.commit()
        refreshed = await self.repository.get_course(course.id, student_sub)
        return await self._serialize_course_with_counts(refreshed)

    async def select_sections_for_student(
        self,
        *,
        student_sub: str,
        course_id: int,
        section_ids: Sequence[int],
    ) -> PlannerCourseResponse:
        course = await self._get_course_for_student(
            student_sub=student_sub,
            course_id=course_id,
        )
        return await self._select_sections(
            student_sub=student_sub,
            course=course,
            section_ids=section_ids,
        )

    # ----- Auto build ----- #
    async def auto_build_schedule(self, student_sub: str) -> PlannerAutoBuildResponse:
        schedule: PlannerSchedule = await self._get_or_create_schedule(student_sub)
        # Ensure sections are available for each course
        for course in schedule.courses:
            if not course.sections:
                await self._fetch_course_sections(
                    student_sub=student_sub,
                    course=course,
                    refresh=False,
                )
        schedule: PlannerSchedule = await self._get_or_create_schedule(student_sub)

        builder_result = self.autobuilder.build(schedule)

        # Update selections according to chosen schedule
        for course in schedule.courses:
            chosen_section_ids = builder_result.get(course.id)
            await self.repository.select_sections(
                course_id=course.id,
                section_ids=list(chosen_section_ids) if chosen_section_ids else [],
            )
        await self.repository.session.commit()

        refreshed = await self._get_or_create_schedule(student_sub)
        scheduled = []
        for course in refreshed.courses:
            selected_sections = [sec for sec in course.sections if sec.is_selected]
            primary_section = selected_sections[0] if selected_sections else None
            scheduled.append(
                AutoBuildCourseResult(
                    course_id=course.id,
                    registrar_course_id=course.registrar_course_id,
                    course_code=course.course_code,
                    selected_section_id=primary_section.id if primary_section else None,
                    selected_section_code=primary_section.section_code if primary_section else None,
                    selected_section_ids=[sec.id for sec in selected_sections],
                )
            )
        return PlannerAutoBuildResponse(
            scheduled=scheduled,
            unscheduled_courses=builder_result.unscheduled_courses,
            message=builder_result.message,
        )

    # ----- Internal helpers ----- #
    async def _get_active_semester(self) -> SemesterOption:
        if self._active_semester is None:
            self._active_semester = await self.registrar_service.get_active_semester()
        return self._active_semester

    async def _serialize_schedule_with_counts(
        self,
        schedule: PlannerSchedule,
    ) -> PlannerScheduleResponse:
        course_ids = [course.id for course in schedule.courses]
        selection_counts = await self.repository.get_selection_counts_for_courses(course_ids)
        priority_map = await self.registrar_service.fetch_course_priorities(
            [course.course_code for course in schedule.courses]
        )
        term_label_fallback = (await self._get_active_semester()).label
        return self.serializer.serialize_schedule(
            schedule,
            selection_counts,
            priority_map,
            term_label_fallback=term_label_fallback,
        )

    async def _serialize_course_with_counts(
        self,
        course: PlannerScheduleCourse,
        priority_map: Dict[str, CoursePriorityRecord] | None = None,
    ) -> PlannerCourseResponse:
        selection_counts = await self.repository.get_selection_counts_for_courses([course.id])
        if priority_map is None:
            priority_map = await self.registrar_service.fetch_course_priorities([course.course_code])
        term_label_fallback = (await self._get_active_semester()).label
        return self.serializer.serialize_course(
            course,
            selection_counts.get(course.id, {}),
            priority_map,
            term_label_fallback=term_label_fallback,
        )

    def _build_planner_search_response(
        self,
        registrar_response: CourseSearchResponse,
    ) -> PlannerCourseSearchResponse:
        planner_items = [
            PlannerCourseSearchResult(
                course_code=item.course_code,
                title=item.title,
                pre_req=item.pre_req,
                co_req=item.co_req,
                anti_req=item.anti_req,
                level=item.level,
                school=item.school,
                credits=item.credits,
                term=item.term,
                priority_1=item.priority_1,
                priority_2=item.priority_2,
                priority_3=item.priority_3,
                priority_4=item.priority_4,
            )
            for item in registrar_response.items
        ]
        return PlannerCourseSearchResponse(items=planner_items, cursor=registrar_response.cursor)

    async def _find_course_summary(
        self,
        *,
        course_code: str,
        term_value: str,
    ) -> Optional[CourseSummary]:
        normalized_target = self.registrar_service.normalize_course_code(course_code)
        request = CourseSearchRequest(
            course_code=course_code,
            term=term_value,
            page=1,
            size=1,
        )
        try:
            response = await self.registrar_service.search_courses(request)
        except HTTPException as exc:
            if exc.status_code not in (502, 504):
                raise
            response = None

        if response:
            for item in response.items:
                if (
                    self.registrar_service.normalize_course_code(item.course_code)
                    == normalized_target
                ):
                    return item

        return None

    async def _get_course_for_student(
        self,
        *,
        student_sub: str,
        course_id: int,
    ) -> PlannerScheduleCourse:
        course = await self.repository.get_course(course_id, student_sub)
        if course is None:
            raise HTTPException(status_code=404, detail="Course not found")
        return course

    @staticmethod
    def _calculate_capacity_total(sections: Iterable[PlannerScheduleSection]) -> Optional[int]:
        capacities = [
            section.capacity
            for section in sections
            if section.capacity is not None and section.capacity > 0
        ]
        if not capacities:
            return None
        return int(sum(capacities))

    @staticmethod
    def _calculate_enrollment_total(
        sections: Iterable[PlannerScheduleSection],
    ) -> Optional[int]:
        enrollments = [
            section.enrollment_snapshot
            for section in sections
            if section.enrollment_snapshot is not None
        ]
        if not enrollments:
            return None
        return int(sum(enrollments))
