from datetime import datetime
import re
from typing import List

from backend.common.schemas import Infra
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.grade_report import Course, CourseItem, StudentCourse, StudentSchedule
from backend.modules.courses.courses import schemas
from backend.modules.courses.courses.repository import CourseRepository
from backend.modules.courses.registrar.service import RegistrarService
from backend.modules.courses.registrar.schemas import (
    CourseSearchRequest,
    SchedulePreferences,
    ScheduleResponse,
    SemesterOption,
    UserScheduleItem,
)


class StudentCourseService:
    def __init__(
        self,
        repository: CourseRepository,
        registrar_service: RegistrarService,
    ):
        self.repository = repository
        self._registrar_service = registrar_service

    async def get_registered_courses(
        self, student_sub: str
    ) -> List[schemas.RegisteredCourseResponse]:
        """
        Retrieve the registered courses for a student, including class averages.

        @param student_sub: The student's sub.
        @return: A list of registered courses with class averages.
        """
        registered_courses: List[StudentCourse] = await self.repository.fetch_registered_courses(student_sub)
        if not registered_courses:
            return []

        class_averages: dict[int, float] = await self.repository.fetch_class_averages(
            course_ids=[reg.course_id for reg in registered_courses]
        )

        result: List[schemas.RegisteredCourseResponse] = []
        for reg in registered_courses:
            class_average = class_averages.get(reg.course_id)
            result.append(
                schemas.RegisteredCourseResponse(
                    id=reg.id,
                    course=schemas.BaseCourseSchema.model_validate(reg.course),
                    items=[schemas.BaseCourseItem.model_validate(item) for item in reg.items],
                    class_average=(
                        float(class_average) if class_average is not None else None
                    ),
                )
            )

        return result



    async def get_courses(
        self,
        infra: Infra,
        page: int,
        size: int,
        term: str | None,
        keyword: str | None,
    ) -> schemas.ListBaseCourseResponse:
        """
        Retrieve a paginated list of courses.

        @param infra: The infrastructure configuration.
        @param page: The page number.
        @param size: The number of courses per page.
        @param term: The term to filter courses by.
        @param keyword: The keyword to search for courses by.
        @return: A paginated list of courses.
        """
        course_ids: list[int] = []
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

        if keyword and course_ids:
            courses = await self.repository.fetch_courses_by_ids(course_ids, term=term)
            count = meili_result.get("estimatedTotalHits", 0) if meili_result else len(courses)
        else:
            courses = await self.repository.fetch_courses_page(
                term=term,
                page=page,
                size=size,
            )
            count = await self.repository.count_courses(term=term)

        total_pages: int = response_builder.calculate_pages(count=count, size=size)

        return response_builder.build_schema(
            schemas.ListBaseCourseResponse,
            courses=[schemas.BaseCourseSchema.model_validate(course) for course in courses],
            total_pages=total_pages,
        )

    async def add_course_item(
        self, course_item_data: schemas.CourseItemCreate, student_sub: str
    ) -> CourseItem | None:
        """
        Add a course item to a registered course.

        @param course_item_data: The course item data.
        @param student_sub: The student's sub.
        @return: The added course item.
        """
        student_course: StudentCourse | None = await self.repository.fetch_student_course_for_owner(
            student_course_id=course_item_data.student_course_id,
            student_sub=student_sub,
            )
        if not student_course:
            return None
        course_item: CourseItem = await self.repository.add_course_item(course_item_data)
        return course_item

    async def update_course_item(
        self, item: CourseItem, item_update: schemas.CourseItemUpdate
    ) -> CourseItem:
        return await self.repository.update_course_item(item=item, update_data=item_update)

    async def delete_course_item(self, item: CourseItem):
        await self.repository.delete_course_item(item=item)

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

    @staticmethod
    def _normalize_course_code(course_code: str | None) -> str:
        if not course_code:
            return ""
        normalized = re.sub(r"\s+", " ", course_code).strip().upper()
        normalized = re.sub(r"\s*/\s*", "/", normalized)
        normalized = re.sub(r"/{2,}", "/", normalized)
        normalized = normalized.strip("/")
        return normalized

    @classmethod
    def _expand_course_code_aliases(cls, course_code: str | None) -> list[str]:
        normalized = cls._normalize_course_code(course_code)
        if not normalized:
            return []
        aliases = [normalized]
        if "/" in normalized:
            parts = [
                cls._normalize_course_code(part)
                for part in normalized.split("/")
                if cls._normalize_course_code(part)
            ]
            if len(parts) >= 2:
                reversed_code = "/".join(reversed(parts))
                if reversed_code and reversed_code not in aliases:
                    aliases.append(reversed_code)
            for part in parts:
                if part not in aliases:
                    aliases.append(part)
        return aliases

    async def _get_or_create_course(
        self, 
        course_code_aliases: List[str], 
        term_value: str,
        term_label: str,
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
        alias_candidates: List[str] = []
        for alias in course_code_aliases:
            normalized = self._normalize_course_code(alias)
            if normalized and normalized not in alias_candidates:
                alias_candidates.append(normalized)

        if not alias_candidates:
            return None

        # First, try to find in local database (using term label)
        course = await self.repository.find_course_by_aliases(alias_candidates, term_label)
        if course:
            return course

        matching_course = None
        for alias in alias_candidates:
            search_request = CourseSearchRequest(
                course_code=alias,
                term=term_value,
                page=1,
            )
            search_response = await self._registrar_service.search_courses(search_request)

            for item in search_response.items:
                normalized_item_code = self._normalize_course_code(item.course_code)
                if normalized_item_code == alias:
                    matching_course = item
                    break

            if matching_course:
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
            course_code=self._normalize_course_code(matching_course.course_code),
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
        
        return await self.repository.create_course(course_data)

    async def sync_courses_from_registrar(
        self, 
        student_sub: str, 
        password: str, 
        username: str,
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
            
        Returns:
            RegistrarSyncResponse containing course list and sync statistics
        """
        # Get student's schedule from registrar
        schedule_response: ScheduleResponse = await self._registrar_service.sync_schedule(
            username=username,
            password=password
        )
        
        # Get semesters to determine current term
        semesters: list[SemesterOption] = await self._registrar_service.list_semesters()
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
        
        # Extract unique course codes from schedule (with alias support)
        schedule_course_aliases: dict[str, list[str]] = {}
        for day_schedule in schedule_response.data:
            for item in day_schedule:
                normalized_code = self._normalize_course_code(item.course_code)
                if not normalized_code:
                    continue
                if normalized_code not in schedule_course_aliases:
                    schedule_course_aliases[normalized_code] = self._expand_course_code_aliases(
                        item.course_code
                    )
        
        # Get all existing student courses for this student
        existing_registrations = await self.repository.fetch_registered_courses(student_sub)
        
        # Map existing courses: course_code -> (StudentCourse, Course)
        existing_courses_map = {}
        for reg in existing_registrations:
            normalized_code = self._normalize_course_code(reg.course.course_code)
            if not normalized_code:
                continue
            existing_courses_map[normalized_code] = (reg, reg.course)
        
        # Determine which courses to add and which to keep/delete
        matched_existing_codes: set[str] = set()
        courses_to_add: list[str] = []
        courses_to_keep: list[str] = []

        for schedule_code, aliases in schedule_course_aliases.items():
            matched_alias = next(
                (alias for alias in aliases if alias in existing_courses_map),
                None,
            )
            if matched_alias:
                courses_to_keep.append(matched_alias)
                matched_existing_codes.add(matched_alias)
            else:
                courses_to_add.append(schedule_code)

        courses_to_delete = set(existing_courses_map.keys()) - matched_existing_codes
        
        # Delete courses no longer in schedule
        for course_code in courses_to_delete:
            student_course, _ = existing_courses_map[course_code]
            await self.repository.delete_student_course(student_course)
        
        # Add new courses from schedule
        added_courses = []
        for course_code in courses_to_add:
            # Get or create course
            course = await self._get_or_create_course(
                course_code_aliases=schedule_course_aliases.get(course_code, [course_code]),
                term_value=current_term_value,
                term_label=current_term_label,
            )
            
            if not course:
                continue
            
            # Create student course registration
            registration_data = schemas.RegisteredCourseCreate(
                course_id=course.id,
                student_sub=student_sub
            )
            student_course = await self.repository.add_student_course(registration_data)
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
        schedule_entries = [
            [item.model_dump() for item in day]
            for day in schedule_response.data
        ]
        preferences = schedule_response.preferences.model_dump()
        await self.repository.upsert_schedule(
            student_sub=student_sub,
            term_value=current_term_value,
            term_label=current_term_label,
            schedule_data=schedule_entries,
            preferences=preferences,
        )

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
        schedule_record: StudentSchedule | None = await self.repository.get_latest_schedule(student_sub)

        if not schedule_record:
            return None

        # Ensure week structure is a list of 7 days
        raw_week: list[list[dict]] = schedule_record.schedule_data or []
        normalized_week: list[list[UserScheduleItem] | None] = []
        for day in raw_week:
            day_items: list[UserScheduleItem] = []
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

