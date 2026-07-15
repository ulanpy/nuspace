from typing import List

import httpx
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

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

    if keyword:
        order_clause = case(
            *[
                (GradeReport.id == grade_report_id, index)
                for index, grade_report_id in enumerate(grade_report_ids)
            ],
            else_=len(grade_report_ids),
        )
        stmt = select(GradeReport).where(*conditions).order_by(order_clause)
        result = await session.execute(stmt)
        grades: List[GradeReport] = list(result.scalars().all())
    else:
        page_num = max(1, page or 1)
        stmt = (
            select(GradeReport)
            .where(*conditions)
            .order_by(GradeReport.created_at.desc())
            .offset((page_num - 1) * size)
            .limit(size)
        )
        result = await session.execute(stmt)
        grades = list(result.scalars().all())

    if keyword:
        count = meili_result.get("estimatedTotalHits", 0)
    else:
        count_stmt = select(func.count()).select_from(GradeReport).where(*conditions)
        count_result = await session.execute(count_stmt)
        count: int = count_result.scalar() or 0

    total_pages: int = response_builder.calculate_pages(count=count, size=size)

    return schemas.ListGradeReportResponse(
        items=[schemas.BaseGradeReportSchema.model_validate(grade) for grade in grades],
        total_pages=total_pages,
        total=count,
        page=page,
        size=size,
        has_next=page < total_pages,
    )
