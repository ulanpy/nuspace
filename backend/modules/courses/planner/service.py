from __future__ import annotations

from collections import defaultdict
import logging
import random
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from fastapi import HTTPException
import re

from backend.modules.courses.planner.repository import PlannerRepository
from backend.modules.courses.planner.schemas import (
    AutoBuildCourseResult,
    PlannerAutoBuildResponse,
    PlannerCourseAddRequest,
    PlannerCourseResponse,
    PlannerSectionResponse,
    PlannerScheduleResponse,
    UnavailableBlock,
)
from backend.modules.courses.registrar.schemas import (
    CourseScheduleEntry,
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

logger = logging.getLogger(__name__)


DAY_TO_INDEX = {"M": 0, "T": 1, "W": 2, "R": 3, "F": 4, "S": 5, "U": 6}
TIME_PATTERN = re.compile(r"(?P<hour>\d{1,2}):(?P<minute>\d{2})\s*(?P<mod>[AP]M)", re.IGNORECASE)


@dataclass
class _SectionSlot:
    section_ids: tuple[int, ...]
    course_id: int
    label: str
    blocks: List[tuple]


class PlannerService:
    def __init__(
        self,
        repository: PlannerRepository,
        registrar_service: RegistrarService,
    ):
        self.repository = repository
        self.registrar_service = registrar_service

    async def _get_or_create_schedule(self, student_sub: str) -> PlannerSchedule:
        schedule = await self.repository.get_schedule_for_student(student_sub)
        if schedule is None:
            schedule = await self.repository.create_schedule(
                student_sub=student_sub,
                title=None,
                notes=None,
                unavailable_blocks=[],
            )
            await self.repository.session.commit()
            schedule = await self.repository.get_schedule_for_student(student_sub)
        return schedule

    async def get_schedule(self, student_sub: str) -> PlannerScheduleResponse:
        schedule = await self._get_or_create_schedule(student_sub)
        return await self._serialize_schedule_with_counts(schedule)

    async def list_semesters(self) -> List[SemesterOption]:
        return await self.registrar_service.list_semesters()

    async def search_courses(
        self,
        *,
        term_value: str,
        course_code: Optional[str],
        page: int,
    ) -> CourseSearchResponse:
        request = CourseSearchRequest(
            course_code=course_code,
            term=term_value,
            page=page,
        )
        return await self.registrar_service.search_courses(request)

    async def reset(
        self,
        *,
        student_sub: str,
        term_value: Optional[str],
    ) -> None:
        await self.repository.reset_student(student_sub, term_value)
        await self.repository.session.commit()

    # ----- Course management ----- #
    async def add_course(
        self,
        *,
        student_sub: str,
        payload: PlannerCourseAddRequest,
    ) -> PlannerCourseResponse:
        schedule = await self._get_or_create_schedule(student_sub)
        logger.debug("Attempting to add course %s for student %s", payload.course_code, student_sub)
        summary: CourseSummary | None = await self._find_course_summary(
            course_code=payload.course_code,
            term_value=payload.term_value,
        )
        if summary is None:
            raise HTTPException(
                status_code=404,
                detail="Course not found in registrar catalog",
            )

        course = await self.repository.add_course_to_planner_schedule(
            schedule_id=schedule.id,
            registrar_course_id=summary.registrar_id,
            course_code=summary.course_code,
            level=summary.level or payload.level,
            school=summary.school,
            term_value=payload.term_value,
            term_label=payload.term_label,
        )
        await self.repository.session.commit()
        logger.debug(
            "Added planner course schedule_id=%s registrar_course_id=%s",
            schedule.id,
            summary.registrar_id,
        )

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
        term_value = course.term_value
        if not term_value:
            raise HTTPException(
                status_code=400,
                detail="Course is missing term information. Remove and re-add the course with a term.",
            )

        if refresh or not course.sections:
            registrar_sections = await self.registrar_service.get_course_schedule(
                course_id=course.registrar_course_id,
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
                    "final_exam": entry.final_exam,
                    "meeting_hash": entry.instance_id,
                    "instance_id": entry.instance_id,
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
            self._serialize_section(section, counts.get(section.section_code, 0))
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
        schedule = await self._get_or_create_schedule(student_sub)
        logger.debug("Auto-build requested for student %s schedule %s", student_sub, schedule.id)
        # Ensure sections are available for each course
        for course in schedule.courses:
            if not course.sections:
                await self._fetch_course_sections(
                    student_sub=student_sub,
                    course=course,
                    refresh=False,
                )
        logger.debug(
            "Fetched sections for %d courses before auto-build", len(schedule.courses)
        )
        schedule = await self._get_or_create_schedule(student_sub)

        builder_result = await self._run_autobuilder(schedule)
        logger.debug(
            "Auto-build result assignments=%s unscheduled=%s",
            builder_result.assignments,
            builder_result.unscheduled_courses,
        )

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
    async def _serialize_schedule_with_counts(
        self,
        schedule: PlannerSchedule,
    ) -> PlannerScheduleResponse:
        course_ids = [course.id for course in schedule.courses]
        selection_counts = await self.repository.get_selection_counts_for_courses(course_ids)
        priority_map = await self.registrar_service.fetch_course_priorities(
            [course.course_code for course in schedule.courses]
        )
        return self._serialize_schedule(schedule, selection_counts, priority_map)

    async def _serialize_course_with_counts(
        self,
        course: PlannerScheduleCourse,
        priority_map: Dict[str, CoursePriorityRecord] | None = None,
    ) -> PlannerCourseResponse:
        selection_counts = await self.repository.get_selection_counts_for_courses([course.id])
        if priority_map is None:
            priority_map = await self.registrar_service.fetch_course_priorities([course.course_code])
        return self._serialize_course(
            course,
            selection_counts.get(course.id, {}),
            priority_map,
        )

    def _serialize_schedule(
        self,
        schedule: PlannerSchedule,
        selection_counts: Optional[Dict[int, Dict[str, int]]] = None,
        priority_map: Optional[Dict[str, CoursePriorityRecord]] = None,
    ) -> PlannerScheduleResponse:
        selection_counts = selection_counts or {}
        return PlannerScheduleResponse(
            id=schedule.id,
            title=schedule.title,
            notes=schedule.notes,
            unavailable_blocks=[
                UnavailableBlock(**block)
                for block in (schedule.unavailable_blocks or [])
            ],
            courses=[
                self._serialize_course(
                    course,
                    selection_counts.get(course.id, {}),
                    priority_map,
                )
                for course in schedule.courses
            ],
        )

    def _serialize_course(
        self,
        course: PlannerScheduleCourse,
        selection_counts: Optional[Dict[str, int]] = None,
        priority_map: Optional[Dict[str, CoursePriorityRecord]] = None,
    ) -> PlannerCourseResponse:
        selection_counts = selection_counts or {}
        normalized_code = self.registrar_service.normalize_course_code(course.course_code)
        priority_record = (priority_map or {}).get(normalized_code)
        return PlannerCourseResponse(
            id=course.id,
            registrar_course_id=course.registrar_course_id,
            course_code=course.course_code,
            level=course.level,
            school=course.school,
            term_value=course.term_value,
            term_label=course.term_label,
            status=course.status,
            capacity_total=course.capacity_total,
            sections=[
                self._serialize_section(
                    section,
                    selection_counts.get(section.section_code, 0),
                )
                for section in course.sections
            ],
            pre_req=priority_record.prerequisite if priority_record else None,
            co_req=priority_record.corequisite if priority_record else None,
            anti_req=priority_record.antirequisite if priority_record else None,
            priority_1=priority_record.priority_1 if priority_record else None,
            priority_2=priority_record.priority_2 if priority_record else None,
            priority_3=priority_record.priority_3 if priority_record else None,
            priority_4=priority_record.priority_4 if priority_record else None,
        )

    @staticmethod
    def _serialize_section(
        section: PlannerScheduleSection,
        selected_count: int,
    ) -> PlannerSectionResponse:
        return PlannerSectionResponse(
            id=section.id,
            section_code=section.section_code,
            days=section.days,
            times=section.times,
            room=section.room,
            faculty=section.faculty,
            capacity=section.capacity,
            enrollment_snapshot=section.enrollment_snapshot,
            final_exam=section.final_exam,
            is_selected=section.is_selected,
            selected_count=selected_count,
        )

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

    async def _run_autobuilder(
        self,
        schedule: PlannerSchedule,
    ):
        courses = schedule.courses
        if not courses:
            return _AutoBuildResult(
                assignments={},
                unscheduled_courses=[],
                message="No courses to schedule",
            )

        options: Dict[int, List[_SectionSlot]] = {}
        for course in courses:
            options[course.id] = self._build_section_slots(course)

        occupancy = self._initial_occupancy(schedule.unavailable_blocks or [])
        course_ids = list(options.keys())
        random.shuffle(course_ids)
        random.shuffle(course_ids)
        assignments: Dict[int, Tuple[int, ...]] = {}
        best_assignment_candidates: List[Dict[int, Tuple[int, ...]]] = []
        best_size = 0

        def backtrack(index: int) -> None:
            nonlocal best_assignment_candidates, best_size
            if index >= len(course_ids):
                current_size = len(assignments)
                if current_size == 0:
                    return
                if current_size > best_size:
                    best_size = current_size
                    best_assignment_candidates = [assignments.copy()]
                elif current_size == best_size:
                    best_assignment_candidates.append(assignments.copy())
                return

            course_id = course_ids[index]
            slots = options[course_id]
            for slot in slots:
                if not slot.blocks:
                    continue
                if self._conflicts(slot, occupancy):
                    continue
                assignments[course_id] = slot.section_ids
                self._add_slot(slot, occupancy)
                backtrack(index + 1)
                self._remove_slot(slot, occupancy)
                assignments.pop(course_id, None)

            # allow skipping course
            backtrack(index + 1)

        backtrack(0)

        chosen_assignments: Dict[int, Tuple[int, ...]] = {}
        if best_assignment_candidates:
            unique_candidates: Dict[
                Tuple[Tuple[int, Tuple[int, ...]], ...], Dict[int, Tuple[int, ...]]
            ] = {}
            for candidate in best_assignment_candidates:
                key = tuple(
                    sorted((course_id, tuple(section_ids)) for course_id, section_ids in candidate.items())
                )
                unique_candidates.setdefault(key, candidate)
            chosen_assignments = random.choice(list(unique_candidates.values()))

        unscheduled = [
            course.course_code
            for course in courses
            if course.id not in chosen_assignments or not chosen_assignments[course.id]
        ]
        message = (
            "shuffle completed with partial schedule"
            if unscheduled and len(unscheduled) < len(courses)
            else (
                "shuffle scheduled all courses"
                if not unscheduled
                else "Unable to schedule any course"
            )
        )

        return _AutoBuildResult(
            assignments=chosen_assignments,
            unscheduled_courses=unscheduled,
            message=message,
        )

    def _build_section_slots(self, course: PlannerScheduleCourse) -> List[_SectionSlot]:
        available_sections = [
            section for section in course.sections if not self._is_section_full(section)
        ]
        if not available_sections:
            logger.debug(
                "Course %s (%s) has no available sections after capacity filter",
                course.course_code,
                course.id,
            )
            return []

        grouped = self._group_sections_by_type(available_sections)
        if not grouped:
            logger.debug(
                "Course %s (%s) has no grouped sections (likely missing schedule data)",
                course.course_code,
                course.id,
            )
            return []

        slots: List[_SectionSlot] = []
        for combo in self._build_section_combinations(grouped):
            slot = self._build_slot_from_sections(combo)
            if slot is not None:
                slots.append(slot)
        logger.debug(
            "Course %s (%s) produced %d slot combinations",
            course.course_code,
            course.id,
            len(slots),
        )
        return slots

    def _group_sections_by_type(
        self, sections: Iterable[PlannerScheduleSection]
    ) -> Dict[str, List[PlannerScheduleSection]]:
        grouped: Dict[str, List[PlannerScheduleSection]] = {}
        for section in sections:
            key = self._section_type_key(section.section_code)
            grouped.setdefault(key, []).append(section)
        for key in grouped:
            random.shuffle(grouped[key])
        return grouped

    def _build_section_combinations(
        self, grouped: Dict[str, List[PlannerScheduleSection]]
    ) -> List[List[PlannerScheduleSection]]:
        if not grouped:
            return []
        ordered = list(grouped.items())
        random.shuffle(ordered)
        combos: List[List[PlannerScheduleSection]] = []
        current: List[PlannerScheduleSection] = []

        def backtrack(idx: int) -> None:
            if idx >= len(ordered):
                combos.append(list(current))
                return
            _, sections = ordered[idx]
            for section in sections:
                current.append(section)
                backtrack(idx + 1)
                current.pop()

        backtrack(0)
        random.shuffle(combos)
        return combos

    def _build_slot_from_sections(
        self, sections: Sequence[PlannerScheduleSection]
    ) -> Optional[_SectionSlot]:
        if not sections:
            return None

        per_day_blocks: Dict[int, List[tuple]] = defaultdict(list)
        blocks: List[tuple] = []
        for section in sections:
            days = [char for char in section.days if char.upper() in DAY_TO_INDEX]
            start_minutes, end_minutes = self._parse_time_range(section.times)
            if start_minutes is None or end_minutes is None:
                return None
            for day_char in days:
                day_idx = DAY_TO_INDEX[day_char.upper()]
                # ensure no overlap inside the same slot
                for existing_start, existing_end in per_day_blocks[day_idx]:
                    if not (end_minutes <= existing_start or start_minutes >= existing_end):
                        logger.debug(
                            "Skipping slot combo for course %s because section %s conflicts within combo",
                            sections[0].planner_schedule_course_id if sections else "unknown",
                            section.section_code,
                        )
                        return None
                per_day_blocks[day_idx].append((start_minutes, end_minutes))
                blocks.append((day_idx, start_minutes, end_minutes))
        if not blocks:
            return None
        label = " / ".join([section.section_code or "Section" for section in sections])
        logger.debug(
            "Built slot combination for course %s with sections %s",
            sections[0].planner_schedule_course_id if sections else "unknown",
            [section.section_code for section in sections],
        )
        return _SectionSlot(
            section_ids=tuple(section.id for section in sections),
            course_id=sections[0].planner_schedule_course_id,
            label=label,
            blocks=blocks,
        )

    @staticmethod
    def _section_type_key(section_code: Optional[str]) -> str:
        if not section_code:
            return "SECTION"
        letters = re.sub(r"[\d\s]+", "", section_code).upper()
        return letters or "SECTION"

    @staticmethod
    def _is_section_full(section: PlannerScheduleSection) -> bool:
        capacity = section.capacity
        enrollment = section.enrollment_snapshot
        if capacity is None:
            return False
        if enrollment is None:
            return False
        return enrollment >= capacity

    def _initial_occupancy(self, raw_blocks: list) -> Dict[int, List[tuple]]:
        occupancy: Dict[int, List[tuple]] = defaultdict(list)
        for block in raw_blocks:
            try:
                parsed = UnavailableBlock(**block) if isinstance(block, dict) else block
            except Exception:
                continue
            day_idx = DAY_TO_INDEX.get(parsed.day.upper())
            if day_idx is None:
                continue
            start_minutes = self._time_to_minutes(parsed.start)
            end_minutes = self._time_to_minutes(parsed.end)
            if start_minutes is None or end_minutes is None:
                continue
            occupancy[day_idx].append((start_minutes, end_minutes))
        return occupancy

    def _conflicts(self, slot: _SectionSlot, occupancy: Dict[int, List[tuple]]) -> bool:
        for day_idx, start, end in slot.blocks:
            for existing_start, existing_end in occupancy.get(day_idx, []):
                if not (end <= existing_start or start >= existing_end):
                    return True
        return False

    def _add_slot(self, slot: _SectionSlot, occupancy: Dict[int, List[tuple]]) -> None:
        for day_idx, start, end in slot.blocks:
            occupancy[day_idx].append((start, end))

    def _remove_slot(self, slot: _SectionSlot, occupancy: Dict[int, List[tuple]]) -> None:
        for day_idx, start, end in slot.blocks:
            try:
                occupancy[day_idx].remove((start, end))
            except ValueError:
                continue

    @staticmethod
    def _time_to_minutes(value: str) -> Optional[int]:
        value = (value or "").strip()
        if not value:
            return None
        match = TIME_PATTERN.search(value)
        if not match:
            return None
        hour = int(match.group("hour"))
        minute = int(match.group("minute"))
        modifier = match.group("mod").upper()
        if modifier == "AM":
            hour = hour % 12
        else:  # PM
            hour = (hour % 12) + 12
        return hour * 60 + minute

    def _parse_time_range(self, value: str) -> tuple[Optional[int], Optional[int]]:
        if not value:
            return None, None
        if "-" not in value:
            return self._time_to_minutes(value), None
        start_raw, end_raw = value.split("-", 1)
        start = self._time_to_minutes(start_raw.strip())
        end = self._time_to_minutes(end_raw.strip())
        return start, end

@dataclass
class _AutoBuildResult:
    assignments: Dict[int, Tuple[int, ...]]
    unscheduled_courses: List[str]
    message: str

    def get(self, key: int) -> Optional[Tuple[int, ...]]:
        return self.assignments.get(key)

