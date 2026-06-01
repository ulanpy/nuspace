from typing import List

import httpx
from sqlalchemy import case
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.grade_report import GradeReport
from backend.modules.courses.statistics import schemas


async def list_grade_reports(
    *,
    session: AsyncSession,
    meilisearch_client: httpx.AsyncClient,
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    term: str | None = None,
) -> schemas.ListGradeReportResponse:
    conditions = []
    meili_filters = [f"term = {term}"] if term else None
    meili_result = None

    if keyword:
        meili_result = await meilisearch.get(
            client=meilisearch_client,
            storage_name=EntityType.grade_reports.value,
            keyword=keyword,
            page=page,
            size=size,
            filters=meili_filters,
        )
        grade_report_ids = [item["id"] for item in meili_result["hits"]]
        if not grade_report_ids:
            return schemas.ListGradeReportResponse(
                items=[],
                total_pages=1,
                total=0,
                page=page,
                size=size,
                has_next=False,
            )

    if keyword:
        conditions.append(GradeReport.id.in_(grade_report_ids))

    qb = QueryBuilder(session=session, model=GradeReport)
    if keyword:
        order_clause = case(
            *[
                (GradeReport.id == grade_report_id, index)
                for index, grade_report_id in enumerate(grade_report_ids)
            ],
            else_=len(grade_report_ids),
        )
        grades: List[GradeReport] = await qb.base().filter(*conditions).order(order_clause).all()
    else:
        grades = (
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
        items=[schemas.BaseGradeReportSchema.model_validate(grade) for grade in grades],
        total_pages=total_pages,
        total=count,
        page=page,
        size=size,
        has_next=page < total_pages,
    )
