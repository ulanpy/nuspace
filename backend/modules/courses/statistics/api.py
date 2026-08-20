from typing import Annotated, List

from backend.common.dependencies import get_uow
from backend.core.database.uow import UnitOfWork
from backend.modules.auth.dependencies import get_creds_or_guest
from backend.modules.courses.statistics import schemas
from backend.modules.courses.statistics.service import list_grade_reports
from fastapi import APIRouter, Depends, Query, Request

router = APIRouter(tags=["Course Statistics"])


@router.get("/grades/terms", response_model=schemas.ListGradeTermsResponse)
async def list_grade_terms(
    _user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    uow: UnitOfWork = Depends(get_uow),
) -> schemas.ListGradeTermsResponse:
    """
    Returns distinct grade report terms (e.g., FA2024, SP2025) for filtering.
    """

    from backend.modules.courses.models.grade_report import GradeReport
    from sqlalchemy import select

    stmt = select(GradeReport.term).distinct().order_by(GradeReport.term.desc())
    async with uow:
        result = await uow.require_session().execute(stmt)
        terms: List[str] = list(result.scalars().all())

    # Remove null/empty terms that may exist in legacy data
    filtered_terms = [term for term in terms if term]
    return schemas.ListGradeTermsResponse(terms=filtered_terms)


@router.get("/grades", response_model=schemas.ListGradeReportResponse)
async def get_grades(
    request: Request,
    _user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    keyword: str | None = Query(
        default=None, description="Search keyword for course code or course title"
    ),
    term: list[str] | None = Query(
        default=None,
        description=(
            "Filter by one or more semester/term codes. Repeat the parameter, "
            "e.g. ?term=FA2024&term=SP2025."
        ),
    ),
    uow: UnitOfWork = Depends(get_uow),
) -> schemas.ListGradeReportResponse:
    """
    Retrieves a paginated list of grade reports statistics with optional keyword search.

    **Access Policy:**
    - Anyone can view grade reports

    **Parameters:**
    - `size`: Number of grade reports per page (default: 20, max: 100)
    - `page`: Page number to retrieve (default: 1)
    - `keyword`: Search term for course code or course title (optional)
    - `term`: Filter results by one or more semester/term codes (optional)

    **Returns:**
    - List of grade reports and pagination info

    **Notes:**
    - When `keyword` is provided, results are ranked by Meilisearch and ordering is preserved
    - When no `keyword` is provided, results are ordered by `created_at` (newest first)
    - Returns an empty list if no results match the search
    """

    return await list_grade_reports(
        uow=uow,
        meilisearch_client=request.app.state.meilisearch_client,
        page=page,
        size=size,
        keyword=keyword,
        terms=term,
    )
