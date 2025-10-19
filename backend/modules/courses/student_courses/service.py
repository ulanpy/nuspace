from typing import List
from datetime import datetime

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.schemas import Infra
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.grade_report import (
    Course,
    CourseItem,
    StudentCourse,
    StudentSchedule,
)
from backend.modules.courses.student_courses import schemas
from backend.modules.courses.crashed.service import RegistrarService
from backend.modules.courses.crashed.schemas import (
    CourseSearchRequest,
    SchedulePreferences,
    ScheduleResponse,
    SemesterOption,
    UserScheduleItem,
)


class StudentCourseService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def register_course(
        self, data: schemas.RegisteredCourseCreate, student_sub: str
    ) -> StudentCourse:
        if data.student_sub == "me":
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

    def _determine_current_semester(self, semesters: List[dict], current_date: datetime) -> str | None:
        """
        Determine current semester based on current date.
        Mapping:
        - Spring: Jan-May (months 1-5)
        - Summer: June-July (months 6-7)
        - Fall: August-Nov (months 8-11)
        - December: next year's Spring (month 12)
        """
        month = current_date.month
        year = current_date.year
        
        if 1 <= month <= 5:
            season = "Spring"
        elif 6 <= month <= 7:
            season = "Summer"
        elif 8 <= month <= 11:
            season = "Fall"
        else:  # December
            season = "Spring"
            year = year + 1
        
        # Find matching semester
        target_label = f"{season} {year}"
        for semester in semesters:
            if semester["label"] == target_label:
                return semester["value"]
        
        return None

    async def _get_or_create_course(
        self, 
        course_code: str, 
        term_value: str,
        term_label: str,
        registrar_service: RegistrarService
    ) -> Course | None:
        """
        Get course from database or fetch from registrar and create it.
        
        Args:
            course_code: Course code like "PHYS 161"
            term_value: Term value like "822" (used for registrar API)
            term_label: Term label like "Fall 2025" (stored in database)
            registrar_service: Service to query registrar API
            
        Returns:
            Course object or None if not found
        """
        # First, try to find in local database (using term label)
        qb = QueryBuilder(session=self.db_session, model=Course)
        course = await (
            qb.base()
            .filter(Course.course_code == course_code, Course.term == term_label)
            .first()
        )
        
        if course:
            return course
        
        # If not found, query registrar (using term value)
        search_request = CourseSearchRequest(
            course_code=course_code,
            term=term_value,
            level=None,
            page=1
        )
        search_response = await registrar_service.search_courses(search_request)
        
        # Find first matching course by course_code
        # (all results are already filtered by term from registrar)
        matching_course = None
        for item in search_response.items:
            if item.course_code == course_code:
                matching_course = item
                break
        
        if not matching_course:
            return None
        
        # Insert course into database (using term label from response)
        try:
            registrar_id = int(matching_course.registrar_id)
        except (ValueError, TypeError):
            return None
            
        course_data = schemas.CourseCreate(
            registrar_id=registrar_id,
            course_code=matching_course.course_code,
            pre_req=matching_course.pre_req,
            anti_req=matching_course.anti_req,
            co_req=matching_course.co_req,
            level=matching_course.level,
            school=matching_course.school,
            description=matching_course.description,
            department=matching_course.department,
            title=matching_course.title,
            credits=int(matching_course.credits) if matching_course.credits else None,
            term=matching_course.term,  # Use term from registrar response
        )
        
        course: Course | None = await qb.add(data=course_data)
        return course

    async def sync_courses_from_registrar(
        self, 
        student_sub: str, 
        password: str, 
        username: str,
        registrar_service: RegistrarService
    ) -> schemas.RegistrarSyncResponse:
        """
        Sync courses from registrar for a student.
        
        Resync behavior:
        - Keeps courses that are still in the schedule
        - Adds new courses from the schedule
        - Deletes student_courses that are no longer in the schedule
        
        Args:
            student_sub: Student's subject identifier
            password: Student's registrar password
            username: Student's registrar username
            registrar_service: Service to query registrar API
            
        Returns:
            RegistrarSyncResponse containing course list and sync statistics
        """
        # Get student's schedule from registrar
        schedule_response: ScheduleResponse = await registrar_service.sync_schedule(
            username=username,
            password=password
        )
        
        # Get semesters to determine current term
        semesters: list[SemesterOption] = await registrar_service.list_semesters()
        semesters_dict = [{"label": s.label, "value": s.value} for s in semesters]
        current_term_value = self._determine_current_semester(
            semesters=semesters_dict,
            current_date=datetime.now()
        )
        
        if not current_term_value:
            return schemas.RegistrarSyncResponse(
                synced_courses=[],
                total_synced=0,
                added_count=0,
                deleted_count=0,
                kept_count=0,
                schedule=None,
                term_label=None,
                term_value=None,
                last_synced_at=None,
            )
        
        # Get current term label
        current_term_label = None
        for sem in semesters_dict:
            if sem["value"] == current_term_value:
                current_term_label = sem["label"]
                break
        
        if not current_term_label:
            return schemas.RegistrarSyncResponse(
                synced_courses=[],
                total_synced=0,
                added_count=0,
                deleted_count=0,
                kept_count=0,
                schedule=None,
                term_label=None,
                term_value=None,
                last_synced_at=None,
            )
        
        # Extract unique course codes from schedule
        schedule_course_codes = set()
        for day_schedule in schedule_response.data:
            for item in day_schedule:
                schedule_course_codes.add(item.course_code)
        
        # Get all existing student courses for this student
        qb = QueryBuilder(session=self.db_session, model=StudentCourse)
        existing_registrations = await (
            qb.base()
            .filter(StudentCourse.student_sub == student_sub)
            .eager(StudentCourse.course, StudentCourse.items)
            .all()
        )
        
        # Map existing courses: course_code -> (StudentCourse, Course)
        existing_courses_map = {}
        for reg in existing_registrations:
            existing_courses_map[reg.course.course_code] = (reg, reg.course)
        
        # Determine which courses to add and which to keep/delete
        courses_to_add = schedule_course_codes - set(existing_courses_map.keys())
        courses_to_keep = schedule_course_codes & set(existing_courses_map.keys())
        courses_to_delete = set(existing_courses_map.keys()) - schedule_course_codes
        
        # Delete courses no longer in schedule
        for course_code in courses_to_delete:
            student_course, _ = existing_courses_map[course_code]
            await qb.delete(target=student_course)
        
        # Add new courses from schedule
        added_courses = []
        for course_code in courses_to_add:
            # Get or create course
            course = await self._get_or_create_course(
                course_code=course_code,
                term_value=current_term_value,
                term_label=current_term_label,
                registrar_service=registrar_service
            )
            
            if not course:
                continue
            
            # Create student course registration
            registration_data = schemas.RegisteredCourseCreate(
                course_id=course.id,
                student_sub=student_sub
            )
            student_course = await qb.add(
                data=registration_data,
                preload=[StudentCourse.course]
            )
            
            added_courses.append(student_course)
        
        # Build response with all current courses
        all_current_courses = []
        
        # Add kept courses
        for course_code in courses_to_keep:
            student_course, course = existing_courses_map[course_code]
            all_current_courses.append(
                schemas.RegisteredCourseResponse(
                    id=student_course.id,
                    course=schemas.BaseCourseSchema.model_validate(course),
                    items=[schemas.BaseCourseItem.model_validate(item) for item in student_course.items]
                )
            )
        
        # Add newly added courses
        for student_course in added_courses:
            all_current_courses.append(
                schemas.RegisteredCourseResponse(
                    id=student_course.id,
                    course=schemas.BaseCourseSchema.model_validate(student_course.course),
                    items=[]
                )
            )
        
        # Upsert schedule snapshot
        schedule_qb = QueryBuilder(session=self.db_session, model=StudentSchedule)
        existing_schedule = await (
            schedule_qb.base()
            .filter(
                StudentSchedule.student_sub == student_sub,
                StudentSchedule.term_value == current_term_value,
            )
            .first()
        )

        schedule_entries = [
            [item.model_dump() for item in day]
            for day in schedule_response.data
        ]
        preferences = schedule_response.preferences.model_dump()

        schedule_payload = schemas.StudentScheduleCreate(
            student_sub=student_sub,
            term_label=current_term_label,
            term_value=current_term_value,
            schedule_data=schedule_entries,
            preferences=preferences,
        )

        if existing_schedule:
            update_data = schemas.StudentScheduleUpdate(
                schedule_data=schedule_entries,
                preferences=preferences,
                last_synced_at=datetime.utcnow(),
            )
            await schedule_qb.update(instance=existing_schedule, update_data=update_data)
        else:
            await schedule_qb.add(data=schedule_payload)

        synced_at = datetime.utcnow()

        return schemas.RegistrarSyncResponse(
            synced_courses=all_current_courses,
            total_synced=len(all_current_courses),
            added_count=len(courses_to_add),
            deleted_count=len(courses_to_delete),
            kept_count=len(courses_to_keep),
            schedule=schedule_response,
            term_label=current_term_label,
            term_value=current_term_value,
            last_synced_at=synced_at,
        )

    async def get_latest_schedule(
        self,
        student_sub: str,
    ) -> schemas.StudentScheduleResponse | None:
        qb = QueryBuilder(session=self.db_session, model=StudentSchedule)
        schedule_record = await (
            qb.base()
            .filter(StudentSchedule.student_sub == student_sub)
            .order(StudentSchedule.last_synced_at.desc())
            .first()
        )

        if not schedule_record:
            return None

        # Ensure week structure is a list of 7 days
        raw_week = schedule_record.schedule_data or []
        normalized_week = []
        for day in raw_week:
            day_items = []
            if isinstance(day, list):
                for item in day:
                    if isinstance(item, dict):
                        try:
                            day_items.append(UserScheduleItem(**item))
                        except Exception:
                            continue
            normalized_week.append(day_items)

        # Pad to 7 days if registrar returned fewer entries
        while len(normalized_week) < 7:
            normalized_week.append([])

        schedule = ScheduleResponse(
            data=normalized_week,
            preferences=SchedulePreferences(**(schedule_record.preferences or {})),
        )

        return schemas.StudentScheduleResponse(
            term_label=schedule_record.term_label,
            term_value=schedule_record.term_value,
            last_synced_at=schedule_record.last_synced_at,
            schedule=schedule,
        )
