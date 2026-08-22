from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Sequence

from backend.modules.courses.courses import schemas
from backend.modules.courses.models.grade_report import (
    Course,
    CourseItem,
    StudentCourse,
    StudentSchedule,
)
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class CourseRepository:
    """Persistence layer for student courses and schedules."""

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def find_course_by_registrar_id(self, registrar_id: int) -> Course | None:
        stmt = select(Course).where(Course.registrar_id == registrar_id)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def find_course_by_catalog_id(self, catalog_id: str) -> Course | None:
        stmt = select(Course).where(Course.catalog_id == catalog_id)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def fetch_registered_courses(self, student_sub: str) -> List[StudentCourse]:
        stmt = (
            select(StudentCourse)
            .where(StudentCourse.student_sub == student_sub)
            .options(
                selectinload(StudentCourse.course),
                selectinload(StudentCourse.items),
            )
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def fetch_class_averages(self, course_ids: Sequence[int]) -> Dict[int, float]:
        """
        Fetch the class averages for a list of course IDs.

        @param course_ids: A sequence of course IDs.
        @return: A dictionary mapping course IDs to class averages.
        """
        if not course_ids:
            return {}

        student_scores_subquery = (
            select(
                StudentCourse.course_id,
                func.sum(
                    case(
                        (
                            func.coalesce(CourseItem.max_score, 0) != 0,
                            func.coalesce(CourseItem.obtained_score, 0)
                            / func.nullif(CourseItem.max_score, 0)
                            * func.coalesce(CourseItem.total_weight_pct, 0),
                        ),
                        else_=0,
                    )
                ).label("student_total_score"),
            )
            .join(CourseItem, StudentCourse.id == CourseItem.student_course_id)
            .where(
                StudentCourse.course_id.in_(course_ids),
                CourseItem.obtained_score.is_not(None),
                CourseItem.max_score.is_not(None),
                CourseItem.total_weight_pct.is_not(None),
                CourseItem.max_score != 0,
            )
            .group_by(StudentCourse.course_id, StudentCourse.id)
            .subquery()
        )

        averaging_query = select(
            student_scores_subquery.c.course_id,
            func.avg(student_scores_subquery.c.student_total_score).label("class_average"),
        ).group_by(student_scores_subquery.c.course_id)

        results = await self.db_session.execute(averaging_query)
        return {row.course_id: row.class_average for row in results.fetchall()}

    async def fetch_student_course_for_owner(
        self, student_course_id: int, student_sub: str
    ) -> StudentCourse | None:
        stmt = select(StudentCourse).where(
            StudentCourse.id == student_course_id,
            StudentCourse.student_sub == student_sub,
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def add_student_course(
        self,
        data: schemas.RegisteredCourseCreate,
    ) -> StudentCourse:
        registration = StudentCourse(**data.model_dump())
        self.db_session.add(registration)
        await self.db_session.flush()
        stmt = (
            select(StudentCourse)
            .where(StudentCourse.id == registration.id)
            .options(selectinload(StudentCourse.course))
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().one()

    async def delete_student_course(self, registration: StudentCourse) -> None:
        await self.db_session.delete(registration)

    async def add_course_item(
        self,
        data: schemas.CourseItemCreate,
    ) -> CourseItem:
        item = CourseItem(**data.model_dump())
        self.db_session.add(item)
        await self.db_session.flush()
        await self.db_session.refresh(item)
        return item

    async def update_course_item(
        self,
        item: CourseItem,
        update_data: schemas.CourseItemUpdate,
    ) -> CourseItem:
        for field, value in update_data.model_dump(exclude_unset=True).items():
            if hasattr(item, field):
                setattr(item, field, value)
        await self.db_session.flush()
        await self.db_session.refresh(item)
        return item

    async def delete_course_item(self, item: CourseItem) -> None:
        await self.db_session.delete(item)

    async def get_course_item_by_id(self, item_id: int) -> CourseItem | None:
        return await self.db_session.get(CourseItem, item_id)

    async def get_student_course_by_id(self, student_course_id: int) -> StudentCourse | None:
        return await self.db_session.get(StudentCourse, student_course_id)

    async def upsert_schedule(
        self,
        student_sub: str,
        term_value: str,
        term_label: str,
        schedule_data: list[list[dict]],
        preferences: dict,
    ) -> None:
        stmt = select(StudentSchedule).where(
            StudentSchedule.student_sub == student_sub,
            StudentSchedule.term_value == term_value,
        )
        result = await self.db_session.execute(stmt)
        existing_schedule = result.scalars().first()

        payload = schemas.StudentScheduleCreate(
            student_sub=student_sub,
            term_label=term_label,
            term_value=term_value,
            schedule_data=schedule_data,
            preferences=preferences,
        )

        if existing_schedule:
            update_data = schemas.StudentScheduleUpdate(
                schedule_data=schedule_data,
                preferences=preferences,
                last_synced_at=datetime.now(timezone.utc),
            )
            for field, value in update_data.model_dump(exclude_unset=True).items():
                if hasattr(existing_schedule, field):
                    setattr(existing_schedule, field, value)
            await self.db_session.flush()
        else:
            schedule = StudentSchedule(**payload.model_dump())
            self.db_session.add(schedule)
            await self.db_session.flush()

    async def get_latest_schedule(self, student_sub: str) -> StudentSchedule | None:
        """
        Get the latest schedule for a student.

        @param student_sub: The student's sub.
        @return: The latest schedule.
        """
        stmt = (
            select(StudentSchedule)
            .where(StudentSchedule.student_sub == student_sub)
            .order_by(StudentSchedule.last_synced_at.desc())
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def create_course(self, data: schemas.CourseCreate) -> Course:
        course = Course(**data.model_dump())
        self.db_session.add(course)
        await self.db_session.flush()
        await self.db_session.refresh(course)
        return course

    async def fetch_courses_by_ids(
        self,
        course_ids: Sequence[int],
        term: str | None = None,
    ) -> List[Course]:
        if not course_ids:
            return []
        order_clause = case(
            *[(Course.id == course_id, index) for index, course_id in enumerate(course_ids)],
            else_=len(course_ids),
        )
        stmt = select(Course).where(Course.id.in_(course_ids))
        if term:
            stmt = stmt.where(Course.term == term)
        stmt = stmt.order_by(order_clause)
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def fetch_courses_page(
        self,
        *,
        page: int,
        size: int,
        term: str | None,
    ) -> List[Course]:
        page_num = max(1, page or 1)
        stmt = select(Course).order_by(Course.created_at.desc())
        if term:
            stmt = stmt.where(Course.term == term)
        stmt = stmt.offset((page_num - 1) * size).limit(size)
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def count_courses(self, *, term: str | None) -> int:
        stmt = select(func.count()).select_from(Course)
        if term:
            stmt = stmt.where(Course.term == term)
        result = await self.db_session.execute(stmt)
        return result.scalar() or 0
