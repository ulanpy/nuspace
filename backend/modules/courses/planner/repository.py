from __future__ import annotations

from typing import Dict, Iterable, List, Optional, Sequence

from sqlalchemy import and_, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.core.database.models.grade_report import (
    Course,
    PlannerSchedule,
    PlannerScheduleCourse,
    PlannerScheduleSection,
)


class PlannerRepository:
    """Data-access helper for planner schedules and related aggregates."""

    def __init__(self, db_session: AsyncSession):
        self.session = db_session

    async def get_schedule_for_student(self, student_sub: str) -> Optional[PlannerSchedule]:
        stmt = (
            select(PlannerSchedule)
            .where(PlannerSchedule.student_sub == student_sub)
            .limit(1)
            .options(
                selectinload(PlannerSchedule.courses).selectinload(
                    PlannerScheduleCourse.sections
            )
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().unique().first()

    async def create_schedule(
        self,
        *,
        student_sub: str,
        title: Optional[str],
        notes: Optional[str],
        unavailable_blocks: list,
    ) -> PlannerSchedule:
        schedule = PlannerSchedule(
            student_sub=student_sub,
            title=title,
            notes=notes,
            unavailable_blocks=unavailable_blocks,
        )
        self.session.add(schedule)
        await self.session.flush()
        return schedule

    async def reset_student(self, student_sub: str, term_value: Optional[str]) -> None:
        schedule_stmt = delete(PlannerSchedule).where(
            PlannerSchedule.student_sub == student_sub
        )
        if term_value:
            schedule_stmt = schedule_stmt.where(
                PlannerSchedule.id.in_(
                    select(PlannerScheduleCourse.planner_schedule_id).where(
                        PlannerScheduleCourse.term_value == term_value
                    )
                )
            )
        await self.session.execute(schedule_stmt)

    # ----- Courses ----- #
    async def get_selection_counts_for_courses(
        self,
        course_ids: Sequence[int],
    ) -> Dict[int, Dict[str, int]]:
        if not course_ids:
            return {}

        # Fetch registrar identifiers so we can aggregate selections across
        # every student's planner that references the same registrar course/term.
        course_meta_stmt = (
            select(
                PlannerScheduleCourse.id,
                PlannerScheduleCourse.registrar_course_id,
                PlannerScheduleCourse.term_value,
            )
            .where(PlannerScheduleCourse.id.in_(course_ids))
        )
        result = await self.session.execute(course_meta_stmt)
        course_meta = {
            course_id: (registrar_course_id, term_value)
            for course_id, registrar_course_id, term_value in result.all()
        }
        if not course_meta:
            return {}

        # Build OR conditions to support NULL term values.
        course_filters = []
        for registrar_course_id, term_value in set(course_meta.values()):
            base_condition = PlannerScheduleCourse.registrar_course_id == registrar_course_id
            if term_value is None:
                course_filters.append(and_(base_condition, PlannerScheduleCourse.term_value.is_(None)))
            else:
                course_filters.append(and_(base_condition, PlannerScheduleCourse.term_value == term_value))

        if not course_filters:
            return {}

        selection_stmt = (
            select(
                PlannerScheduleCourse.registrar_course_id,
                PlannerScheduleCourse.term_value,
                PlannerScheduleSection.section_code,
                func.count().label("total"),
            )
            .select_from(PlannerScheduleSection)
            .join(
                PlannerScheduleCourse,
                PlannerScheduleSection.planner_schedule_course_id == PlannerScheduleCourse.id,
            )
            .where(
                PlannerScheduleSection.is_selected.is_(True),
                or_(*course_filters),
            )
            .group_by(
                PlannerScheduleCourse.registrar_course_id,
                PlannerScheduleCourse.term_value,
                PlannerScheduleSection.section_code,
            )
        )
        selection_result = await self.session.execute(selection_stmt)

        aggregated_counts: Dict[tuple[str, Optional[str]], Dict[str, int]] = {}
        for registrar_course_id, term_value, section_code, total in selection_result.all():
            key = (registrar_course_id, term_value)
            course_counts = aggregated_counts.setdefault(key, {})
            course_counts[section_code] = int(total)

        response: Dict[int, Dict[str, int]] = {}
        for course_id, key in course_meta.items():
            response[course_id] = aggregated_counts.get(key, {})
        return response

    async def add_course_to_planner_schedule(
        self,
        *,
        schedule_id: int,
        registrar_course_id: str,
        course_code: str,
        level: Optional[str],
        school: Optional[str],
        term_value: Optional[str],
        term_label: Optional[str],
        status: str = "draft",
    ) -> PlannerScheduleCourse:
        course = PlannerScheduleCourse(
            planner_schedule_id=schedule_id,
            registrar_course_id=registrar_course_id,
            course_code=course_code,
            level=level,
            school=school,
            term_value=term_value,
            term_label=term_label,
            status=status,
        )
        self.session.add(course)
        await self.session.flush()
        return course

    async def get_course(
        self,
        course_id: int,
        student_sub: str,
    ) -> Optional[PlannerScheduleCourse]:
        stmt = (
            select(PlannerScheduleCourse)
            .join(PlannerSchedule, PlannerScheduleCourse.planner_schedule_id == PlannerSchedule.id)
            .where(
                PlannerScheduleCourse.id == course_id,
                PlannerSchedule.student_sub == student_sub,
            )
            .options(selectinload(PlannerScheduleCourse.sections))
        )
        result = await self.session.execute(stmt)
        return result.scalars().unique().first()

    async def delete_course(self, course: PlannerScheduleCourse) -> None:
        await self.session.delete(course)
        await self.session.flush()

    async def replace_sections(
        self,
        *,
        course: PlannerScheduleCourse,
        sections_payload: Iterable[dict],
    ) -> List[PlannerScheduleSection]:
        existing = {sec.section_code: sec for sec in course.sections}
        # delete existing sections to avoid stale data
        await self.session.execute(
            delete(PlannerScheduleSection).where(
                PlannerScheduleSection.planner_schedule_course_id == course.id
            )
        )
        new_sections: List[PlannerScheduleSection] = []
        for payload in sections_payload:
            section_code = payload.get("section_code", "")
            prev = existing.get(section_code)
            new_sections.append(
                PlannerScheduleSection(
                    planner_schedule_course_id=course.id,
                    section_code=section_code,
                    days=payload.get("days", ""),
                    times=payload.get("times", ""),
                    room=payload.get("room"),
                    faculty=payload.get("faculty"),
                    capacity=payload.get("capacity"),
                    enrollment_snapshot=payload.get("enrollment"),
                    final_exam=payload.get("final_exam", False),
                    is_selected=prev.is_selected if prev else False,
                    meeting_hash=payload.get("meeting_hash") or payload.get("instance_id"),
                )
            )
        self.session.add_all(new_sections)
        await self.session.flush()
        return new_sections

    async def select_sections(
        self,
        *,
        course_id: int,
        section_ids: Sequence[int],
    ) -> List[PlannerScheduleSection]:
        stmt = select(PlannerScheduleSection).where(
            PlannerScheduleSection.planner_schedule_course_id == course_id
        )
        result = await self.session.execute(stmt)
        sections = result.scalars().all()
        target_ids = set(section_ids)
        for section in sections:
            section.is_selected = section.id in target_ids
        await self.session.flush()
        return sections

    async def find_catalog_course(
        self,
        *,
        course_code: str,
        level: Optional[str],
        term_label: Optional[str],
    ) -> Optional[Course]:
        normalized = self._normalize_course_code(course_code)
        code_expr = func.replace(
            func.replace(func.lower(Course.course_code), " ", ""),
            "-",
            "",
        )
        stmt = select(Course).where(code_expr == normalized)
        if level:
            stmt = stmt.where(func.lower(Course.level) == level.lower())
        stmt = stmt.limit(1)
        result = await self.session.execute(stmt)
        return result.scalars().first()


    async def update_course_capacity(
        self,
        *,
        course_id: int,
        capacity_total: Optional[int],
        enrollment_total: Optional[int],
    ) -> None:
        await self.session.execute(
            update(PlannerScheduleCourse)
            .where(PlannerScheduleCourse.id == course_id)
            .values(
                capacity_total=capacity_total,
                enrollment_total=enrollment_total,
            )
        )

