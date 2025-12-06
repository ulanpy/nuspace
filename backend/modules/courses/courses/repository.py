from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Sequence

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.core.database.models.grade_report import (
    Course,
    CourseItem,
    StudentCourse,
    StudentSchedule,
)
from backend.modules.courses.courses import schemas


class CourseRepository:
    """Persistence layer for student courses and schedules."""

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    def _base_student_course_qb(self) -> QueryBuilder[StudentCourse]:
        return QueryBuilder(session=self.db_session, model=StudentCourse)

    def _base_schedule_qb(self) -> QueryBuilder[StudentSchedule]:
        return QueryBuilder(session=self.db_session, model=StudentSchedule)

    def _base_course_qb(self) -> QueryBuilder[Course]:
        return QueryBuilder(session=self.db_session, model=Course)

    async def find_course_by_registrar_id(self, registrar_id: int) -> Course | None:
        qb = self._base_course_qb()
        return await (
            qb.base()
            .filter(Course.registrar_id == registrar_id)
            .first()
        )
    async def fetch_registered_courses(self, student_sub: str) -> List[StudentCourse]:
        qb = self._base_student_course_qb()
        return await (
            qb.base()
            .filter(StudentCourse.student_sub == student_sub)
            .eager(StudentCourse.course, StudentCourse.items)
            .all()
        )

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
        qb = self._base_student_course_qb()
        return await (
            qb.base()
            .filter(
                StudentCourse.id == student_course_id,
                StudentCourse.student_sub == student_sub,
            )
            .first()
        )

    async def add_student_course(
        self,
        data: schemas.RegisteredCourseCreate,
    ) -> StudentCourse:
        qb = self._base_student_course_qb()
        return await qb.add(data=data, preload=[StudentCourse.course])

    async def delete_student_course(self, registration: StudentCourse) -> None:
        qb = self._base_student_course_qb()
        await qb.delete(target=registration)

    async def add_course_item(
        self,
        data: schemas.CourseItemCreate,
    ) -> CourseItem:
        qb = QueryBuilder(session=self.db_session, model=CourseItem)
        return await qb.add(data=data)

    async def update_course_item(
        self,
        item: CourseItem,
        update_data: schemas.CourseItemUpdate,
    ) -> CourseItem:
        qb = QueryBuilder(session=self.db_session, model=CourseItem)
        return await qb.update(instance=item, update_data=update_data)

    async def delete_course_item(self, item: CourseItem) -> None:
        qb = QueryBuilder(session=self.db_session, model=CourseItem)
        await qb.delete(target=item)

    async def upsert_schedule(
        self,
        student_sub: str,
        term_value: str,
        term_label: str,
        schedule_data: list[list[dict]],
        preferences: dict,
    ) -> None:
        schedule_qb = self._base_schedule_qb()
        existing_schedule = await (
            schedule_qb.base()
            .filter(
                StudentSchedule.student_sub == student_sub,
                StudentSchedule.term_value == term_value,
            )
            .first()
        )

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
                last_synced_at=datetime.utcnow(),
            )
            await schedule_qb.update(instance=existing_schedule, update_data=update_data)
        else:
            await schedule_qb.add(data=payload)

    async def get_latest_schedule(self, student_sub: str) -> StudentSchedule | None:
        """
        Get the latest schedule for a student.

        @param student_sub: The student's sub.
        @return: The latest schedule.
        """
        schedule_qb = self._base_schedule_qb()
        return await (
            schedule_qb.base()
            .filter(StudentSchedule.student_sub == student_sub)
            .order(StudentSchedule.last_synced_at.desc())
            .first()
        )

    async def create_course(self, data: schemas.CourseCreate) -> Course:
        qb = self._base_course_qb()
        return await qb.add(data=data)

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
        qb = self._base_course_qb()
        query = qb.base().filter(Course.id.in_(course_ids))
        if term:
            query = query.filter(Course.term == term)
        return await query.order(order_clause).all()

    async def fetch_courses_page(
        self,
        *,
        page: int,
        size: int,
        term: str | None,
    ) -> List[Course]:
        qb = self._base_course_qb()
        query = qb.base()
        if term:
            query = query.filter(Course.term == term)
        return (
            await query.order(Course.created_at.desc())
            .paginate(size=size, page=page)
            .all()
        )

    async def count_courses(self, *, term: str | None) -> int:
        qb = self._base_course_qb()
        query = qb.base(count=True)
        if term:
            query = query.filter(Course.term == term)
        return await query.count()

