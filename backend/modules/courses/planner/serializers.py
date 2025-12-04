from __future__ import annotations

from typing import Dict, Optional

from backend.core.database.models.grade_report import (
    PlannerSchedule,
    PlannerScheduleCourse,
    PlannerScheduleSection,
)
from backend.modules.courses.planner.schemas import (
    PlannerCourseResponse,
    PlannerScheduleResponse,
    PlannerSectionResponse,
)
from backend.modules.courses.registrar.service import (
    CoursePriorityRecord,
    RegistrarService,
)


class PlannerSerializer:
    def __init__(self, registrar_service: RegistrarService) -> None:
        self.registrar_service = registrar_service

    def serialize_schedule(
        self,
        schedule: PlannerSchedule,
        selection_counts: Optional[Dict[int, Dict[str, int]]] = None,
        priority_map: Optional[Dict[str, CoursePriorityRecord]] = None,
    ) -> PlannerScheduleResponse:
        selection_counts = selection_counts or {}
        return PlannerScheduleResponse(
            id=schedule.id,
            courses=[
                self.serialize_course(
                    course,
                    selection_counts.get(course.id, {}),
                    priority_map,
                )
                for course in schedule.courses
            ],
        )

    def serialize_course(
        self,
        course: PlannerScheduleCourse,
        selection_counts: Optional[Dict[str, int]] = None,
        priority_map: Optional[Dict[str, CoursePriorityRecord]] = None,
    ) -> PlannerCourseResponse:
        selection_counts = selection_counts or {}
        priority_map = priority_map or {}
        normalized_code = self.registrar_service.normalize_course_code(course.course_code)
        priority_record = priority_map.get(normalized_code)
        return PlannerCourseResponse(
            id=course.id,
            registrar_course_id=course.registrar_course_id,
            course_code=course.course_code,
            level=course.level,
            school=course.school,
            term_value=course.term_value,
            term_label=course.term_label,
            capacity_total=course.capacity_total,
            sections=[
                self.serialize_section(
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
    def serialize_section(
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
            is_selected=section.is_selected,
            selected_count=selected_count,
        )

