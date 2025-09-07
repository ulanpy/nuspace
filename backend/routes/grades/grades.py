from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models import GradeReport
from backend.core.database.models.common_enums import EntityType
from backend.routes.grades import schemas

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
    Retrieves a paginated list of grade reports with search functionality.

    **Access Policy:**
    - All authenticated users can view grade reports

    **Parameters:**
    - `size`: Number of grade reports per page (default: 20, max: 100)
    - `page`: Page number (default: 1)
    - `keyword`: Search keyword for course code or course title (optional)

    **Returns:**
    - List of grade reports matching the criteria with pagination info

    **Notes:**
    - Results are ordered by creation date in descending order
    - Search is performed on course code and course title fields
    - Returns empty list if no results found for search keyword
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


@router.get("/grades/{id}", response_model=schemas.BaseGradeReportSchema)
async def get_grade(
    id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.BaseGradeReportSchema:
    """
    Retrieves a grade report by id.
    """
    qb = QueryBuilder(session=db_session, model=GradeReport)
    grade = await qb.base().filter(GradeReport.id == id).first()
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade report not found")
    return schemas.BaseGradeReportSchema.model_validate(grade)
