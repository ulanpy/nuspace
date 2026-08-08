from __future__ import annotations

import logging
from typing import Dict, Iterable, List, Optional, Sequence

from backend.core.database.uow import UnitOfWork
from backend.modules.courses.models.grade_report import (
    PlannerSchedule,
    PlannerScheduleCourse,
    PlannerScheduleSection,
)
from backend.modules.courses.planner.autobuilder import PlannerAutoBuilder
from backend.modules.courses.planner.constants import (
    DEFAULT_SCHEDULE_NAME,
    MAX_PLANNER_SCHEDULES_PER_STUDENT,
)
from backend.modules.courses.planner.interfaces import CourseCatalogLookup
from backend.modules.courses.planner.repository import PlannerRepository
from backend.modules.courses.planner.schemas import (
    AutoBuildCourseResult,
    PlannerAutoBuildResponse,
    PlannerCourseAddRequest,
    PlannerCourseResponse,
    PlannerCourseSearchResponse,
    PlannerCourseSearchResult,
    PlannerScheduleCreateRequest,
    PlannerScheduleDuplicateRequest,
    PlannerScheduleListResponse,
    PlannerScheduleResponse,
    PlannerScheduleSummary,
    PlannerScheduleUpdateRequest,
    PlannerSectionResponse,
)
from backend.modules.courses.planner.serializers import PlannerSerializer
from backend.modules.courses.registrar.schemas import (
    CourseSearchRequest,
    CourseSearchResponse,
    CourseSummary,
    SemesterOption,
)
from backend.modules.courses.registrar.service import CoursePriorityRecord
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class PlannerService:
    def __init__(
        self,
        uow: UnitOfWork,
        course_catalog: CourseCatalogLookup,
        active_semester: SemesterOption,
    ):
        self.uow = uow
        self.course_catalog = course_catalog
        self.active_semester = active_semester
        self.autobuilder = PlannerAutoBuilder()
        self.serializer = PlannerSerializer(course_catalog)

    async def _resolve_schedule(
        self,
        student_sub: str,
        schedule_id: Optional[int] = None,
    ) -> PlannerSchedule:
        if schedule_id is not None:
            async with self.uow:
                planner_repo = self.uow.get_repo(PlannerRepository)
                schedule = await planner_repo.get_schedule_by_id(schedule_id, student_sub)
            if schedule is None:
                raise HTTPException(status_code=404, detail="Schedule not found")
            return schedule

        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            schedule = await planner_repo.get_default_schedule_for_student(student_sub)
            if schedule is None:
                schedule = await planner_repo.create_schedule(
                    student_sub=student_sub,
                    name=DEFAULT_SCHEDULE_NAME,
                )
                schedule = await planner_repo.get_schedule_by_id(schedule.id, student_sub)
                if schedule is None:
                    raise HTTPException(status_code=500, detail="Failed to create planner schedule")
        return schedule

    async def _ensure_schedule_capacity(self, student_sub: str) -> None:
        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            count = await planner_repo.count_schedules_for_student(student_sub)
        if count >= MAX_PLANNER_SCHEDULES_PER_STUDENT:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "schedule_limit_reached",
                    "message": (
                        f"You can have at most {MAX_PLANNER_SCHEDULES_PER_STUDENT} "
                        "schedule variants."
                    ),
                },
            )

    @staticmethod
    def _default_schedule_name(existing_count: int) -> str:
        if existing_count == 0:
            return DEFAULT_SCHEDULE_NAME
        return f"Schedule {existing_count + 1}"

    @staticmethod
    def _duplicate_schedule_name(source_name: str) -> str:
        base = f"Copy of {source_name}".strip()
        return base[:64]

    async def list_schedules(self, student_sub: str) -> PlannerScheduleListResponse:
        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            schedules = await planner_repo.list_schedules_for_student(student_sub)
            if not schedules:
                await self._resolve_schedule(student_sub)
                schedules = await planner_repo.list_schedules_for_student(student_sub)

        items = [
            PlannerScheduleSummary(
                id=schedule.id,
                name=schedule.name,
                course_count=len(schedule.courses),
            )
            for schedule in schedules
        ]
        return PlannerScheduleListResponse(
            items=items,
            count=len(items),
            max_allowed=MAX_PLANNER_SCHEDULES_PER_STUDENT,
        )

    async def create_schedule_variant(
        self,
        *,
        student_sub: str,
        payload: PlannerScheduleCreateRequest,
    ) -> PlannerScheduleSummary:
        await self._ensure_schedule_capacity(student_sub)

        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            existing_count = await planner_repo.count_schedules_for_student(student_sub)

            name = (payload.name or "").strip() or self._default_schedule_name(existing_count)
            schedule = await planner_repo.create_schedule(
                student_sub=student_sub,
                name=name,
            )

        return PlannerScheduleSummary(
            id=schedule.id,
            name=schedule.name,
            course_count=0,
        )

    async def duplicate_schedule_variant(
        self,
        *,
        student_sub: str,
        schedule_id: int,
        payload: PlannerScheduleDuplicateRequest,
    ) -> PlannerScheduleSummary:
        await self._ensure_schedule_capacity(student_sub)
        source = await self._resolve_schedule(student_sub, schedule_id)
        name = (payload.name or "").strip() or self._duplicate_schedule_name(source.name)
        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            duplicate = await planner_repo.duplicate_schedule(
                source,
                student_sub=student_sub,
                name=name,
            )
        return PlannerScheduleSummary(
            id=duplicate.id,
            name=duplicate.name,
            course_count=len(duplicate.courses),
        )

    async def update_schedule_variant(
        self,
        *,
        student_sub: str,
        schedule_id: int,
        payload: PlannerScheduleUpdateRequest,
    ) -> PlannerScheduleSummary:

        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            schedule = await planner_repo.get_schedule_by_id(schedule_id, student_sub)
            if schedule is None:
                raise HTTPException(status_code=404, detail="Schedule not found")
            await planner_repo.update_schedule_name(
                schedule_id=schedule.id,
                student_sub=student_sub,
                name=payload.name.strip(),
            )
            schedule.name = payload.name.strip()
            result = PlannerScheduleSummary(
                id=schedule.id, name=schedule.name, course_count=len(schedule.courses)
            )
        return result

    async def delete_schedule_variant(
        self,
        *,
        student_sub: str,
        schedule_id: int,
    ) -> None:
        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            count = await planner_repo.count_schedules_for_student(student_sub)
            if count <= 1:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "cannot_delete_last_schedule",
                        "message": "At least one schedule variant must remain.",
                    },
                )
            deleted = await planner_repo.delete_schedule(schedule_id, student_sub)

        if not deleted:
            raise HTTPException(status_code=404, detail="Schedule not found")

    async def get_schedule(
        self,
        student_sub: str,
        schedule_id: Optional[int] = None,
    ) -> PlannerScheduleResponse:
        schedule = await self._resolve_schedule(student_sub, schedule_id)
        return await self._serialize_schedule_with_counts(schedule)

    async def refresh_all_courses(
        self,
        student_sub: str,
        schedule_id: Optional[int] = None,
    ) -> PlannerScheduleResponse:
        schedule = await self._resolve_schedule(student_sub, schedule_id)
        for course in schedule.courses:
            try:
                await self._fetch_course_sections(
                    student_sub=student_sub,
                    course=course,
                    refresh=True,
                )
            except HTTPException as exc:
                # Keep stale sections when a course is missing/unavailable in the
                # catalog (e.g. cancelled or temporarily absent after a new parse).
                # One bad course must not fail the whole schedule refresh.
                if exc.status_code in (502, 503, 504):
                    logger.warning(
                        "planner refresh skipped course_id=%s code=%s status=%s detail=%s",
                        course.id,
                        course.course_code,
                        exc.status_code,
                        exc.detail,
                    )
                    continue
                raise
        refreshed = await self._resolve_schedule(student_sub, schedule.id)
        return await self._serialize_schedule_with_counts(refreshed)

    async def list_semesters(self) -> List[SemesterOption]:
        return [self.active_semester]

    async def search_courses(
        self,
        *,
        term_value: str,
        course_code: Optional[str],
        size: int,
        page: int,
    ) -> PlannerCourseSearchResponse:
        _ = term_value  # Planner is locked to the active registrar term.
        active_term = self.active_semester
        request = CourseSearchRequest(
            course_code=course_code,
            term=active_term.value,
            page=page,
            size=size,
        )
        registrar_response = await self.course_catalog.search_courses(request)
        return self._build_planner_search_response(registrar_response)

    async def reset(
        self,
        *,
        student_sub: str,
        term_value: Optional[str],
        schedule_id: Optional[int] = None,
    ) -> None:
        schedule = await self._resolve_schedule(student_sub, schedule_id)
        resolved_term = term_value or self.active_semester.value

        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            await planner_repo.reset_schedule_courses(schedule.id, resolved_term)

    # ----- Course management ----- #
    async def add_course(
        self,
        *,
        student_sub: str,
        payload: PlannerCourseAddRequest,
        schedule_id: Optional[int] = None,
    ) -> PlannerCourseResponse:
        schedule = await self._resolve_schedule(student_sub, schedule_id)
        active_term = self.active_semester
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
        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            course = await planner_repo.add_course_to_planner_schedule(
                schedule_id=schedule.id,
                registrar_course_id=summary.registrar_id,
                course_code=summary.course_code,
                level=level,
                school=summary.school or None,
                term_value=active_term.value,
                term_label=summary.term or payload.term_label or active_term.label,
                metadata_json={
                    "title": summary.title,
                    "credits": summary.credits,
                },
            )
            # `sections` is serialized after this transaction. Reload the aggregate
            # with its collection eager-loaded so no detached lazy load is attempted.
            course = await planner_repo.get_course(course.id, student_sub)
            if course is None:
                raise HTTPException(status_code=500, detail="Failed to create planner course")
        return await self._serialize_course_with_counts(course)

    async def remove_course(
        self,
        *,
        student_sub: str,
        course_id: int,
    ) -> None:
        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            course = await planner_repo.get_course(course_id, student_sub)
            if course is None:
                raise HTTPException(status_code=404, detail="Course not found")

            await planner_repo.delete_course(course)

    async def _fetch_course_sections(
        self,
        *,
        student_sub: str,
        course: PlannerScheduleCourse,
        refresh: bool = False,
    ) -> List[PlannerSectionResponse]:
        active_term = self.active_semester
        term_value = active_term.value
        if course.term_value != term_value:
            course.term_value = term_value
            course.term_label = active_term.label

        if refresh or not course.sections:
            registrar_sections = await self.course_catalog.get_course_schedule(
                course_code=course.course_code,
                term=term_value,
            )

            # Merge multiple meetings for the same section_code into one section entry.
            def _merge_text(base: str | None, new_val: str | None) -> str:
                parts = []
                for val in (base, new_val):
                    if val:
                        parts.extend([p.strip() for p in val.split("/") if p.strip()])
                seen = []
                for p in parts:
                    if p not in seen:
                        seen.append(p)
                return " / ".join(seen)

            merged: Dict[str, dict] = {}
            for entry in registrar_sections:
                key = entry.section_code or ""
                current = merged.get(key) or {
                    "section_code": entry.section_code,
                    "days": "",
                    "times": "",
                    "room": None,
                    "faculty": None,
                    "capacity": entry.capacity,
                    "enrollment": entry.enrollment,
                }
                current["days"] = _merge_text(current["days"], entry.days)
                current["times"] = _merge_text(current["times"], entry.times)
                current["room"] = (
                    _merge_text(current.get("room"), entry.room)
                    if entry.room
                    else current.get("room")
                )
                current["faculty"] = (
                    _merge_text(current.get("faculty"), entry.faculty)
                    if entry.faculty
                    else current.get("faculty")
                )
                if current.get("capacity") is None and entry.capacity is not None:
                    current["capacity"] = entry.capacity
                if current.get("enrollment") is None and entry.enrollment is not None:
                    current["enrollment"] = entry.enrollment
                merged[key] = current

            payload = list(merged.values())
            async with self.uow:
                planner_repo = self.uow.get_repo(PlannerRepository)
                # The caller holds a detached course aggregate. Reload it in this
                # session before `replace_sections` reads its existing sections.
                managed_course = await planner_repo.get_course(course.id, student_sub)
                if managed_course is None:
                    raise HTTPException(status_code=404, detail="Course not found")
                new_sections = await planner_repo.replace_sections(
                    course=managed_course,
                    sections_payload=payload,
                )
                capacity_total = self._calculate_capacity_total(new_sections)
                enrollment_total = self._calculate_enrollment_total(new_sections)
                await planner_repo.update_course_capacity(
                    course_id=managed_course.id,
                    capacity_total=capacity_total,
                    enrollment_total=enrollment_total,
                )
                course = await planner_repo.get_course(managed_course.id, student_sub)
                if course is None:
                    raise HTTPException(status_code=404, detail="Course not found")

        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            selection_counts = await planner_repo.get_selection_counts_for_courses([course.id])
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
        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            await planner_repo.select_sections(course_id=course.id, section_ids=section_ids)
            refreshed = await planner_repo.get_course(course.id, student_sub)
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
    async def auto_build_schedule(
        self,
        student_sub: str,
        schedule_id: Optional[int] = None,
    ) -> PlannerAutoBuildResponse:
        schedule = await self._resolve_schedule(student_sub, schedule_id)
        for course in schedule.courses:
            if not course.sections:
                await self._fetch_course_sections(
                    student_sub=student_sub,
                    course=course,
                    refresh=False,
                )
        schedule = await self._resolve_schedule(student_sub, schedule.id)

        builder_result = self.autobuilder.build(schedule)

        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            for course in schedule.courses:
                chosen_section_ids = builder_result.get(course.id)
                await planner_repo.select_sections(
                    course_id=course.id,
                    section_ids=list(chosen_section_ids) if chosen_section_ids else [],
                )

        refreshed = await self._resolve_schedule(student_sub, schedule.id)
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

    async def _serialize_schedule_with_counts(
        self,
        schedule: PlannerSchedule,
    ) -> PlannerScheduleResponse:
        course_ids = [course.id for course in schedule.courses]
        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            selection_counts = await planner_repo.get_selection_counts_for_courses(course_ids)
        priority_map = await self.course_catalog.fetch_course_priorities(
            [course.course_code for course in schedule.courses]
        )
        term_label_fallback = self.active_semester.label
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
        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            selection_counts = await planner_repo.get_selection_counts_for_courses([course.id])
        if priority_map is None:
            priority_map = await self.course_catalog.fetch_course_priorities([course.course_code])
        term_label_fallback = self.active_semester.label
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
        normalized_target = self.course_catalog.normalize_course_code(course_code)
        request = CourseSearchRequest(
            course_code=course_code,
            term=term_value,
            page=1,
            size=1,
        )
        try:
            response = await self.course_catalog.search_courses(request)
        except HTTPException as exc:
            if exc.status_code not in (502, 504):
                raise
            response = None

        if response:
            for item in response.items:
                if self.course_catalog.course_codes_match(item.course_code, course_code):
                    return item
                if self.course_catalog.normalize_course_code(item.course_code) == normalized_target:
                    return item

        return None

    async def _get_course_for_student(
        self,
        *,
        student_sub: str,
        course_id: int,
    ) -> PlannerScheduleCourse:
        async with self.uow:
            planner_repo = self.uow.get_repo(PlannerRepository)
            course = await planner_repo.get_course(course_id, student_sub)
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
