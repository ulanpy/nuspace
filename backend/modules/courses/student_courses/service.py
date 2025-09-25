from typing import List

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.schemas import Infra
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.grade_report import Course, CourseItem, StudentCourse
from backend.modules.courses.student_courses import schemas


class StudentCourseService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def register_course(
        self, data: schemas.RegisteredCourseCreate, student_sub: str
    ) -> StudentCourse:
        data.student_sub = student_sub
        qb = QueryBuilder(session=self.db_session, model=StudentCourse)

        existing_registration = (
            await qb.base()
            .filter(StudentCourse.student_sub == student_sub, StudentCourse.course_id == data.course_id)
            .first()
        )

        if existing_registration:
            return None

        student_course = await qb.add(data=data, preload=[StudentCourse.course])
        return student_course

    async def get_registered_courses(self, student_sub: str) -> List[schemas.RegisteredCourseResponse]:
        qb = QueryBuilder(session=self.db_session, model=StudentCourse)

        registrations: List[StudentCourse] = await (
            qb.base()
            .filter(StudentCourse.student_sub == student_sub)
            .eager(StudentCourse.course, StudentCourse.items)
            .all()
        )

        course_ids = [reg.course_id for reg in registrations]

        if not course_ids:
            return []

        student_scores_subquery = (
            select(
                StudentCourse.course_id,
                func.sum((CourseItem.obtained_score_pct / 100.0) * CourseItem.total_weight_pct).label(
                    "student_total_score"
                ),
            )
            .join(CourseItem, StudentCourse.id == CourseItem.student_course_id)
            .where(StudentCourse.course_id.in_(course_ids))
            .group_by(StudentCourse.course_id, StudentCourse.id)
            .subquery()
        )

        class_averages_query = select(
            student_scores_subquery.c.course_id,
            func.avg(student_scores_subquery.c.student_total_score).label("class_average"),
        ).group_by(student_scores_subquery.c.course_id)

        class_averages_result = await self.db_session.execute(class_averages_query)
        class_averages_dict = {
            row.course_id: float(row.class_average) if row.class_average is not None else None
            for row in class_averages_result
        }

        result = []
        for reg in registrations:
            class_average = class_averages_dict.get(reg.course_id)
            result.append(
                schemas.RegisteredCourseResponse(
                    id=reg.id,
                    course=schemas.BaseCourseSchema.model_validate(reg.course),
                    items=[schemas.BaseCourseItem.model_validate(item) for item in reg.items],
                    class_average=class_average,
                )
            )

        return result

    async def unregister_course(self, student_course_id: int, student_sub: str) -> bool:
        qb = QueryBuilder(session=self.db_session, model=StudentCourse)

        registration = (
            await qb.base()
            .filter(StudentCourse.id == student_course_id, StudentCourse.student_sub == student_sub)
            .first()
        )

        if not registration:
            return False

        await qb.delete(target=registration)
        return True

    async def get_terms(self) -> List[str]:
        qb = QueryBuilder(session=self.db_session, model=Course)
        terms: List[str] = await qb.base().distinct(Course.term).all()
        return terms

    async def get_courses(
        self,
        infra: Infra,
        page: int,
        size: int,
        term: str | None,
        keyword: str | None,
    ) -> schemas.ListBaseCourseResponse:
        filters = []
        if term:
            filters.append(Course.term == term)

        course_ids = []
        meili_result = None
        if keyword:
            meili_result = await meilisearch.get(
                client=infra.meilisearch_client,
                storage_name=EntityType.courses.value,
                keyword=keyword,
                page=page,
                size=size,
                filters=None,
            )
            course_ids = [item["id"] for item in meili_result["hits"]]

            if not course_ids:
                return schemas.ListBaseCourseResponse(courses=[], total_pages=1)
            filters.append(Course.id.in_(course_ids))

        qb = QueryBuilder(session=self.db_session, model=Course)

        if keyword and course_ids:
            order_clause = case(
                *[(Course.id == course_id, index) for index, course_id in enumerate(course_ids)],
                else_=len(course_ids),
            )
            courses: List[Course] = await qb.base().filter(*filters).order(order_clause).all()
        else:
            courses: List[Course] = (
                await qb.base()
                .filter(*filters)
                .paginate(size, page)
                .order(Course.created_at.desc())
                .all()
            )

        if keyword and meili_result:
            count = meili_result.get("estimatedTotalHits", 0)
        else:
            count: int = await qb.blank(model=Course).base(count=True).filter(*filters).count()

        total_pages: int = response_builder.calculate_pages(count=count, size=size)

        return response_builder.build_schema(
            schemas.ListBaseCourseResponse,
            courses=[schemas.BaseCourseSchema.model_validate(course) for course in courses],
            total_pages=total_pages,
        )

    async def add_course_item(
        self, course_item_data: schemas.CourseItemCreate, student_sub: str
    ) -> CourseItem | None:
        qb = QueryBuilder(session=self.db_session, model=StudentCourse)
        student_course = (
            await qb.base()
            .filter(
                StudentCourse.id == course_item_data.student_course_id,
                StudentCourse.student_sub == student_sub,
            )
            .first()
        )

        if not student_course:
            return None

        item_qb = QueryBuilder(session=self.db_session, model=CourseItem)
        item: CourseItem = await item_qb.add(data=course_item_data)
        return item

    async def update_course_item(
        self, item: CourseItem, item_update: schemas.CourseItemUpdate
    ) -> CourseItem:
        qb = QueryBuilder(session=self.db_session, model=CourseItem)
        item = await qb.update(
            instance=item,
            update_data=item_update,
        )
        return item

    async def delete_course_item(self, item: CourseItem):
        qb = QueryBuilder(session=self.db_session, model=CourseItem)
        await qb.delete(target=item)
