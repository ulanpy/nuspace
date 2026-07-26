from __future__ import annotations

from typing import Dict, Iterable, List, Optional, Sequence

from sqlalchemy import and_, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.modules.courses.models.grade_report import (
    Course,
    PlannerSchedule,
    PlannerScheduleCourse,
    PlannerScheduleSection,
)


class PlannerRepository:
    """Data-access helper for planner schedules and related aggregates."""

    def __init__(self, db_session: AsyncSession):
        self.session = db_session

    def _schedule_load_options(self):
        return selectinload(PlannerSchedule.courses).selectinload(PlannerScheduleCourse.sections)

    async def count_schedules_for_student(self, student_sub: str) -> int:
        stmt = select(func.count()).select_from(PlannerSchedule).where(
            PlannerSchedule.student_sub == student_sub
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def list_schedules_for_student(self, student_sub: str) -> List[PlannerSchedule]:
        stmt = (
            select(PlannerSchedule)
            .where(PlannerSchedule.student_sub == student_sub)
            .order_by(PlannerSchedule.created_at.asc(), PlannerSchedule.id.asc())
            .options(selectinload(PlannerSchedule.courses))
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().unique().all())

    async def get_schedule_by_id(
        self,
        schedule_id: int,
        student_sub: str,
    ) -> Optional[PlannerSchedule]:
        stmt = (
            select(PlannerSchedule)
            .where(
                PlannerSchedule.id == schedule_id,
                PlannerSchedule.student_sub == student_sub,
            )
            .options(self._schedule_load_options())
        )
        result = await self.session.execute(stmt)
        return result.scalars().unique().first()

    async def get_default_schedule_for_student(self, student_sub: str) -> Optional[PlannerSchedule]:
        stmt = (
            select(PlannerSchedule)
            .where(PlannerSchedule.student_sub == student_sub)
            .order_by(PlannerSchedule.created_at.asc(), PlannerSchedule.id.asc())
            .limit(1)
            .options(self._schedule_load_options())
        )
        result = await self.session.execute(stmt)
        return result.scalars().unique().first()

    async def get_schedule_for_student(self, student_sub: str) -> Optional[PlannerSchedule]:
        return await self.get_default_schedule_for_student(student_sub)

    async def create_schedule(
        self,
        *,
        student_sub: str,
        name: str,
    ) -> PlannerSchedule:
        schedule = PlannerSchedule(
            student_sub=student_sub,
            name=name,
        )
        self.session.add(schedule)
        await self.session.flush()
        return schedule

    async def update_schedule_name(
        self,
        *,
        schedule_id: int,
        student_sub: str,
        name: str,
    ) -> None:
        await self.session.execute(
            update(PlannerSchedule)
            .where(
                PlannerSchedule.id == schedule_id,
                PlannerSchedule.student_sub == student_sub,
            )
            .values(name=name)
        )

    async def delete_schedule(self, schedule_id: int, student_sub: str) -> bool:
        schedule = await self.get_schedule_by_id(schedule_id, student_sub)
        if schedule is None:
            return False
        await self.session.delete(schedule)
        await self.session.flush()
        return True

    async def duplicate_schedule(
        self,
        source: PlannerSchedule,
        *,
        student_sub: str,
        name: str,
    ) -> PlannerSchedule:
        loaded = await self.get_schedule_by_id(source.id, student_sub)
        if loaded is None:
            raise ValueError("source schedule not found")
        new_schedule = await self.create_schedule(
            student_sub=student_sub,
            name=name,
        )
        for course in loaded.courses:
            new_course = PlannerScheduleCourse(
                planner_schedule_id=new_schedule.id,
                registrar_course_id=course.registrar_course_id,
                course_code=course.course_code,
                level=course.level,
                school=course.school,
                term_value=course.term_value,
                term_label=course.term_label,
                metadata_json=dict(course.metadata_json or {}),
                capacity_total=course.capacity_total,
                enrollment_total=course.enrollment_total,
            )
            self.session.add(new_course)
            await self.session.flush()
            for section in course.sections:
                self.session.add(
                    PlannerScheduleSection(
                        planner_schedule_course_id=new_course.id,
                        section_code=section.section_code,
                        days=section.days,
                        times=section.times,
                        room=section.room,
                        faculty=section.faculty,
                        capacity=section.capacity,
                        enrollment_snapshot=section.enrollment_snapshot,
                        is_selected=section.is_selected,
                    )
                )
        await self.session.flush()
        reloaded = await self.get_schedule_by_id(new_schedule.id, student_sub)
        return reloaded or new_schedule

    async def reset_schedule_courses(
        self,
        schedule_id: int,
        term_value: Optional[str],
    ) -> None:
        stmt = delete(PlannerScheduleCourse).where(
            PlannerScheduleCourse.planner_schedule_id == schedule_id
        )
        if term_value:
            stmt = stmt.where(PlannerScheduleCourse.term_value == term_value)
        await self.session.execute(stmt)

    # ----- Courses ----- #
    async def get_selection_counts_for_courses(
        self,
        course_ids: Sequence[int],
    ) -> Dict[int, Dict[str, int]]:
        """
        Return how many students picked each section, aggregated by course_code + term.
        Using course_code instead of registrar_course_id avoids mismatches between
        data sources (PCC IDs vs Meilisearch course codes).
        """
        if not course_ids:
            return {}

        course_meta_stmt = (
            select(
                PlannerScheduleCourse.id,
                PlannerScheduleCourse.course_code,
                PlannerScheduleCourse.term_value,
            )
            .where(PlannerScheduleCourse.id.in_(course_ids))
        )
        result = await self.session.execute(course_meta_stmt)
        course_meta = {
            course_id: (course_code, term_value)
            for course_id, course_code, term_value in result.all()
        }
        if not course_meta:
            return {}

        course_filters = []
        for course_code, term_value in set(course_meta.values()):
            base_condition = PlannerScheduleCourse.course_code == course_code
            if term_value is None:
                course_filters.append(and_(base_condition, PlannerScheduleCourse.term_value.is_(None)))
            else:
                course_filters.append(and_(base_condition, PlannerScheduleCourse.term_value == term_value))

        if not course_filters:
            return {}

        selection_stmt = (
            select(
                PlannerScheduleCourse.course_code,
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
                PlannerScheduleCourse.course_code,
                PlannerScheduleCourse.term_value,
                PlannerScheduleSection.section_code,
            )
        )
        selection_result = await self.session.execute(selection_stmt)

        aggregated_counts: Dict[tuple[str, Optional[str]], Dict[str, int]] = {}
        for course_code, term_value, section_code, total in selection_result.all():
            key = (course_code, term_value)
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
        metadata_json: Optional[dict] = None,
    ) -> PlannerScheduleCourse:
        course = PlannerScheduleCourse(
            planner_schedule_id=schedule_id,
            registrar_course_id=registrar_course_id,
            course_code=course_code,
            level=level,
            school=school,
            term_value=term_value,
            term_label=term_label,
            metadata_json=metadata_json or {},
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
                    is_selected=prev.is_selected if prev else False,
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

    @staticmethod
    def _normalize_course_code(course_code: str) -> str:
        return course_code.replace("-", "").replace(" ", "").strip().lower()
