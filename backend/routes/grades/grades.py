from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.common.utils import meilisearch, response_builder
from backend.common.utils.enums import ResourceAction
from backend.core.database.models import GradeReport
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.grade_report import Course, CourseItem, StudentCourse
from backend.routes.grades import dependencies as deps
from backend.routes.grades import schemas
from backend.routes.grades.policy import CourseItemPolicy

router = APIRouter(tags=["Grades"])


@router.get("/grades", response_model=schemas.ListGradeReportResponse)
async def get_grades(
    request: Request,
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    keyword: str | None = Query(
        default=None, description="Search keyword for course code or course title"
    ),
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.ListGradeReportResponse:
    """
    Retrieves a paginated list of grade reports with optional keyword search.

    **Access Policy:**
    - Anyone can view grade reports

    **Parameters:**
    - `size`: Number of grade reports per page (default: 20, max: 100)
    - `page`: Page number to retrieve (default: 1)
    - `keyword`: Search term for course code or course title (optional)

    **Returns:**
    - List of grade reports and pagination info

    **Notes:**
    - When `keyword` is provided, results are ranked by Meilisearch and ordering is preserved
    - When no `keyword` is provided, results are ordered by `created_at` (newest first)
    - Returns an empty list if no results match the search
    """

    conditions = []

    if keyword:
        meili_result = await meilisearch.get(
            request=request,
            storage_name=EntityType.grade_reports.value,
            keyword=keyword,
            page=page,
            size=size,
            filters=None,
        )
        grade_report_ids = [item["id"] for item in meili_result["hits"]]

        if not grade_report_ids:
            return schemas.ListGradeReportResponse(grades=[], total_pages=1)

    if keyword:
        conditions.append(GradeReport.id.in_(grade_report_ids))

    qb = QueryBuilder(session=db_session, model=GradeReport)
    if keyword:
        # Preserve Meilisearch ranking order by using a custom order
        from sqlalchemy import case

        order_clause = case(
            *[
                (GradeReport.id == grade_report_id, index)
                for index, grade_report_id in enumerate(grade_report_ids)
            ],
            else_=len(grade_report_ids),
        )
        grades: List[GradeReport] = await qb.base().filter(*conditions).order(order_clause).all()
    else:
        # Alphabetical order when no keyword
        grades: List[GradeReport] = (
            await qb.base()
            .filter(*conditions)
            .paginate(size, page)
            .order(GradeReport.created_at.desc())
            .all()
        )
    if keyword:
        count = meili_result.get("estimatedTotalHits", 0)
    else:
        count: int = await qb.blank(model=GradeReport).base(count=True).filter(*conditions).count()
    total_pages: int = response_builder.calculate_pages(count=count, size=size)

    return schemas.ListGradeReportResponse(
        grades=[schemas.BaseGradeReportSchema.model_validate(grade) for grade in grades],
        total_pages=total_pages,
    )


@router.post("/registered_courses", response_model=schemas.RegisteredCourseResponse)
async def register_course(
    data: schemas.RegisteredCourseCreate,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
):
    student_sub = user[0].get("sub")
    data.student_sub = student_sub
    qb = QueryBuilder(session=db_session, model=StudentCourse)

    existing_registration = (
        await qb.base()
        .filter(StudentCourse.student_sub == student_sub, StudentCourse.course_id == data.course_id)
        .first()
    )

    if existing_registration:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Course already registered for this student.",
        )

    student_course = await qb.add(data=data, preload=[StudentCourse.course])

    return schemas.RegisteredCourseResponse(
        id=student_course.id, course=student_course.course, items=[]
    )


@router.get("/registered_courses", response_model=List[schemas.RegisteredCourseResponse])
async def get_registered_courses(
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
):
    student_sub = user[0].get("sub")
    qb = QueryBuilder(session=db_session, model=StudentCourse)

    registrations: List[StudentCourse] = await (
        qb.base()
        .filter(StudentCourse.student_sub == student_sub)
        .eager(StudentCourse.course, StudentCourse.items)
        .all()
    )

    # Get class averages for all courses in a single efficient query
    course_ids = [reg.course_id for reg in registrations]

    # Handle case where there are no registrations
    if not course_ids:
        return []

    # Subquery to calculate the total score for each student in each course
    student_scores_subquery = (
        select(
            StudentCourse.course_id,
            func.sum((CourseItem.obtained_score_pct / 100.0) * CourseItem.total_weight_pct).label(
                "student_total_score"
            ),
        )
        .join(CourseItem, StudentCourse.id == CourseItem.student_course_id)
        .where(StudentCourse.course_id.in_(course_ids))
        .group_by(StudentCourse.course_id, StudentCourse.id)  # Group by each student's registration
        .subquery()
    )

    # Main query to average the student total scores for each course
    class_averages_query = select(
        student_scores_subquery.c.course_id,
        func.avg(student_scores_subquery.c.student_total_score).label("class_average"),
    ).group_by(student_scores_subquery.c.course_id)

    # Execute the aggregation query
    class_averages_result = await db_session.execute(class_averages_query)
    class_averages_dict = {
        row.course_id: float(row.class_average) if row.class_average is not None else None
        for row in class_averages_result
    }

    # Build the response with pre-calculated class averages
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


@router.delete("/registered_courses/{student_course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_course(
    student_course_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
):
    student_sub = user[0].get("sub")
    qb = QueryBuilder(session=db_session, model=StudentCourse)

    registration = (
        await qb.base()
        .filter(StudentCourse.id == student_course_id, StudentCourse.student_sub == student_sub)
        .first()
    )

    if not registration:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found.")

    await qb.delete(target=registration)


@router.get("/terms", response_model=List[str])
async def get_terms(
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Retrieves a list of all unique terms from the courses table.

    **Access Policy:**
    - Anyone can view terms

    **Returns:**
    - List of unique terms
    """
    qb = QueryBuilder(session=db_session, model=Course)
    terms: List[str] = await qb.base().distinct(Course.term).all()
    return terms


@router.get("/courses", response_model=schemas.ListBaseCourseResponse)
async def get_courses(
    request: Request,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    term: str | None = Query(default=None, description="Filter courses by term"),
    keyword: str | None = Query(
        default=None, description="Search keyword for course code or course title"
    ),
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.ListBaseCourseResponse:
    """
    Retrieves a paginated list of all courses with optional keyword search.

    **Access Policy:**
    - Anyone can view courses

    **Parameters:**
    - `page`: Page number to retrieve (default: 1)
    - `size`: Number of courses per page (default: 20, max: 100)
    - `keyword`: Search term for course code or course title (optional)

    **Returns:**
    - List of base course records and pagination info

    **Notes:**
    - When `keyword` is provided, results are ranked by Meilisearch and ordering is preserved
    - When no `keyword` is provided, results are ordered by `created_at` (newest first)
    - Returns an empty list if no results match the search
    """

    filters = []
    if term:
        filters.append(Course.term == term)
    if keyword:
        meili_result = await meilisearch.get(
            request=request,
            storage_name=EntityType.courses.value,
            keyword=keyword,
            page=page,
            size=size,
            filters=None,
        )
        course_ids = [item["id"] for item in meili_result["hits"]]

        if not course_ids:
            return schemas.ListBaseCourseResponse(courses=[], total_pages=1)

    if keyword:
        filters.append(Course.id.in_(course_ids))

    qb = QueryBuilder(session=db_session, model=Course)

    if keyword:
        # Preserve Meilisearch ranking order by using a custom order
        from sqlalchemy import case

        order_clause = case(
            *[(Course.id == course_id, index) for index, course_id in enumerate(course_ids)],
            else_=len(course_ids),
        )
        courses: List[Course] = await qb.base().filter(*filters).order(order_clause).all()
    else:
        # Alphabetical order when no keyword
        courses: List[Course] = (
            await qb.base()
            .filter(*filters)
            .paginate(size, page)
            .order(Course.created_at.desc())
            .all()
        )
    if keyword:
        count = meili_result.get("estimatedTotalHits", 0)
    else:
        count: int = await qb.blank(model=Course).base(count=True).filter(*filters).count()
    total_pages: int = response_builder.calculate_pages(count=count, size=size)

    return response_builder.build_schema(
        schemas.ListBaseCourseResponse,
        courses=[schemas.BaseCourseSchema.model_validate(course) for course in courses],
        total_pages=total_pages,
    )


@router.post("/course_items", response_model=schemas.BaseCourseItem)
async def add_course_item(
    request: Request,
    course_item_data: schemas.CourseItemCreate,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.BaseCourseItem:

    student_sub = user[0].get("sub")
    qb = QueryBuilder(session=db_session, model=StudentCourse)

    student_course = (
        await qb.base()
        .filter(
            StudentCourse.id == course_item_data.student_course_id,
            StudentCourse.student_sub == student_sub,
        )
        .first()
    )

    if not student_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registered course not found for this user.",
        )

    item_qb = QueryBuilder(session=db_session, model=CourseItem)
    item: CourseItem = await item_qb.add(data=course_item_data)

    return item


@router.patch("/course_items/{item_id}", response_model=schemas.BaseCourseItem)
async def update_course_item(
    request: Request,
    item_update: schemas.CourseItemUpdate,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    item: CourseItem = Depends(deps.course_item_exists_or_404),
) -> schemas.BaseCourseItem:
    await CourseItemPolicy(user=user, db_session=db_session).check_permission(
        action=ResourceAction.UPDATE, item=item, item_data=item_update
    )

    qb = QueryBuilder(session=db_session, model=CourseItem)
    item = await qb.update(
        instance=item,
        update_data=item_update,
    )
    return item


@router.delete("/course_items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course_item(
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    item: CourseItem = Depends(deps.course_item_exists_or_404),
) -> None:
    await CourseItemPolicy(user=user, db_session=db_session).check_permission(
        action=ResourceAction.DELETE, item=item
    )
    qb = QueryBuilder(session=db_session, model=CourseItem)
    await qb.delete(target=item)
    return
