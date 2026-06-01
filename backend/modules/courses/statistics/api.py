from typing import List

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session
from backend.modules.courses.statistics import schemas
from backend.modules.courses.statistics.service import list_grade_reports

router = APIRouter(tags=["Course Statistics"])


@router.get("/grades/terms", response_model=schemas.ListGradeTermsResponse)
async def list_grade_terms(
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.ListGradeTermsResponse:
    """
    Returns distinct grade report terms (e.g., FA2024, SP2025) for filtering.
    """

    from backend.common.cruds import QueryBuilder
    from backend.core.database.models.grade_report import GradeReport

    qb = QueryBuilder(session=db_session, model=GradeReport)
    terms: List[str] = (
        await qb.base()
        .attributes(GradeReport.term)
        .distinct(GradeReport.term)
        .order(GradeReport.term.desc())
        .all()
    )

    # Remove null/empty terms that may exist in legacy data
    filtered_terms = [term for term in terms if term]
    return schemas.ListGradeTermsResponse(terms=filtered_terms)


@router.get("/grades", response_model=schemas.ListGradeReportResponse)
async def get_grades(
    request: Request,
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    keyword: str | None = Query(
        default=None, description="Search keyword for course code or course title"
    ),
    term: str | None = Query(
        default=None,
        description="Filter by semester/term code (e.g., FA2024)",
    ),
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.ListGradeReportResponse:
    """
    Retrieves a paginated list of grade reports statistics with optional keyword search.

    **Access Policy:**
    - Anyone can view grade reports

    **Parameters:**
    - `size`: Number of grade reports per page (default: 20, max: 100)
    - `page`: Page number to retrieve (default: 1)
    - `keyword`: Search term for course code or course title (optional)
    - `term`: Filter results by semester/term code (optional)

    **Returns:**
    - List of grade reports and pagination info

    **Notes:**
    - When `keyword` is provided, results are ranked by Meilisearch and ordering is preserved
    - When no `keyword` is provided, results are ordered by `created_at` (newest first)
    - Returns an empty list if no results match the search
    """

    return await list_grade_reports(
        session=db_session,
        meilisearch_client=request.app.state.meilisearch_client,
        page=page,
        size=size,
        keyword=keyword,
        term=term,
    )
