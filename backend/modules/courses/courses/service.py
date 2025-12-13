from datetime import datetime, timezone
import re
from typing import List

from backend.common.schemas import Infra
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.grade_report import Course, CourseItem, StudentCourse, StudentSchedule
from backend.modules.courses.courses import schemas
from backend.modules.courses.courses.errors import CourseLookupError, SemesterResolutionError
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

    def _determine_current_semester(self, semesters: List[SemesterOption], current_date: datetime) -> str | None:
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
            if semester.label == target_label:
                return semester.value
        
        return None

    @staticmethod
    def _normalize_course_code(course_code: str | None) -> str:
        """
        Normalize course codes by:
        - collapsing whitespace
        - uppercasing
        - trimming leading/trailing slashes
        - converting “A / B” to “A/B”
        - collapsing multiple slashes to a single slash

        Examples:
        - collapse whitespace: "  phys   161 "       -> "PHYS 161"
        - uppercase: "phys 161"                       -> "PHYS 161"
        - trim slashes: "/PHYS 161/"                  -> "PHYS 161"
        - normalize spaced slash: "MATH / 161"        -> "MATH/161"
        - ensure space before number: "WCS260"        -> "WCS 260"
        - cross-list spacing: "WCS260/WLL235"         -> "WCS 260/WLL 235"
        - collapse double slash: "COMP 101//102"      -> "COMP 101/102"
        """
        if not course_code:
            return ""
        normalized = re.sub(r"\s+", " ", course_code).strip().upper()
        normalized = re.sub(r"\s*/\s*", "/", normalized)
        normalized = re.sub(r"/{2,}", "/", normalized)
        normalized = normalized.strip("/")

        # Ensure a space between subject and catalog number in each segment
        parts: list[str] = []
        for part in normalized.split("/"):
            part = part.strip()
            part = re.sub(r"^([A-Z]+)\s*([0-9].*)$", r"\1 \2", part)
            parts.append(part)

        return "/".join(parts)

    def _resolve_fallback_term_value(
        self,
        semesters: List[SemesterOption],
        current_term_value: str,
    ) -> str | None:
        """Return the next available older term_value, if any."""
        term_values = [sem.value for sem in semesters]
        try:
            idx = term_values.index(current_term_value)
        except ValueError:
            return None
        return term_values[idx + 1] if idx + 1 < len(term_values) else None

    async def _get_or_create_course(
        self,
        course_code: str,
        term_value: str,
        fallback_term_value: str | None = None,
    ) -> Course | None:
        """
        Get course from database or fetch from registrar and create it.
        
        Args:
            course_code: Normalized course code like "PHYS 161"
            term_value: Term value like "822" (used for registrar API)
            registrar_service: Service to query registrar API
            
        Returns:
            Course object or None if not found
        """
        if not course_code:
            return None

        matching_course = None
        candidates = [course_code]
        if "/" in course_code:
            parts = [p.strip() for p in course_code.split("/") if p.strip()]
            if len(parts) == 2:
                reversed_code = "/".join(reversed(parts))
                if reversed_code not in candidates:
                    candidates.append(reversed_code)
            for part in parts:
                if part and part not in candidates:
                    candidates.append(part)

        # try primary term
        for candidate in candidates:
            search_request = CourseSearchRequest(
                course_code=candidate,
                term=term_value,
                
                page=1,
            )
            search_response = await self._registrar_service.search_courses(search_request)

            for item in search_response.items:
                normalized_item_code = self._normalize_course_code(item.course_code)
                if normalized_item_code == candidate:
                    matching_course = item
                    break
            if matching_course:
                break

        # fallback term if needed
        if not matching_course and fallback_term_value:
            for candidate in candidates:
                fallback_request = CourseSearchRequest(
                    course_code=candidate,
                    term=fallback_term_value,
                    page=1,
                )
                fallback_response = await self._registrar_service.search_courses(fallback_request)
                for item in fallback_response.items:
                    normalized_item_code = self._normalize_course_code(item.course_code)
                    if normalized_item_code == candidate:
                        matching_course = item
                        break
                if matching_course:
                    break

        if not matching_course:
            raise CourseLookupError(f"Course not found in registrar for term {term_value}")

        # Insert course into database (using term label from response)
        try:
            registrar_id = int(matching_course.registrar_id)
        except (ValueError, TypeError):
            return None

        existing_by_registrar: Course | None = await self.repository.find_course_by_registrar_id(registrar_id)
        if existing_by_registrar:
            return existing_by_registrar
            
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
        current_term_value = self._determine_current_semester(
            semesters=semesters,
            current_date=datetime.now()
        )
        
        if current_term_value is None:
            raise SemesterResolutionError("Unable to determine current registrar semester.")
        
        # Get current term label
        current_term_label = next((sem.label for sem in semesters if sem.value == current_term_value), None)
        if current_term_label is None:
            raise SemesterResolutionError("Unable to resolve current registrar semester label.")
        
        # Extract unique course codes from schedule (store only normalized full codes;
        # matching against existing registrations handles cross-list variants)
        schedule_codes: set[str] = set()
        for day_schedule in schedule_response.data:
            for item in day_schedule:
                normalized_code = self._normalize_course_code(item.course_code)
                if not normalized_code:
                    continue
                schedule_codes.add(normalized_code)
        
        # Get all existing student courses for this student
        existing_registrations = await self.repository.fetch_registered_courses(student_sub)
        
        # Map existing courses: course_code -> (StudentCourse, Course)
        existing_courses_map = {}
        for reg in existing_registrations:
            normalized_code = self._normalize_course_code(reg.course.course_code)
            if not normalized_code:
                continue
            if normalized_code not in existing_courses_map:
                existing_courses_map[normalized_code] = (reg, reg.course)

            # also map reversed and parts to avoid duplicate inserts for cross-listed codes
            if "/" in normalized_code:
                parts = [p.strip() for p in normalized_code.split("/") if p.strip()]
                if len(parts) == 2:
                    reversed_code = "/".join(reversed(parts))
                    if reversed_code not in existing_courses_map:
                        existing_courses_map[reversed_code] = (reg, reg.course)
                for part in parts:
                    if part and part not in existing_courses_map:
                        existing_courses_map[part] = (reg, reg.course)
        
        # Determine which courses to add and which to keep/delete
        matched_existing_codes: set[str] = set()
        courses_to_add: list[str] = []
        courses_to_keep: list[str] = []

        for schedule_code in schedule_codes:
            if schedule_code in existing_courses_map:
                courses_to_keep.append(schedule_code)
                matched_existing_codes.add(schedule_code)
            else:
                courses_to_add.append(schedule_code)

        courses_to_delete = set(existing_courses_map.keys()) - matched_existing_codes
        
        fallback_term_value = self._resolve_fallback_term_value(semesters, current_term_value)

        # Delete courses no longer in schedule
        for course_code in courses_to_delete:
            student_course, _ = existing_courses_map[course_code]
            await self.repository.delete_student_course(student_course)
        
        # Add new courses from schedule
        added_courses = []
        for course_code in courses_to_add:
            # Get or create course
            course = await self._get_or_create_course(
                course_code=course_code,
                term_value=current_term_value,
                fallback_term_value=fallback_term_value,
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

        synced_at = datetime.now(timezone.utc)

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

        normalized_week: list[list[UserScheduleItem]] = [
            [UserScheduleItem(**item) for item in day]
            for day in schedule_record.schedule_data
        ]

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

