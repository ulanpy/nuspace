import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_current_principals, get_db_session

from .schemas import UploadSummary
from .utils import import_from_csv

router = APIRouter(prefix="/grades", tags=["Grades"])


@router.post("/upload")
async def upload_grades(
    file: UploadFile = File(...),
    course_code: str = Form(...),
    term: str = Form(...),
    replace: bool = Form(False),
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)] = None,
) -> UploadSummary:
    """Accept a normalized CSV file and import rows into grade_reports.

    The heavy work runs in a thread (sync DB engine). If replace=True, existing
    rows for course_code+term will be deleted before insert.
    """
    try:
        inserted = await asyncio.to_thread(
            import_from_csv, file.file, 50, replace, course_code, term
        )
    except Exception as exc:  # pragma: no cover - surface errors to client
        return UploadSummary(imported=0, skipped=0, errors=[{"error": str(exc)}])

    return UploadSummary(imported=inserted, skipped=0, errors=[])


@router.get("/reports")
async def get_reports(
    term: str = Query(...),
    course_code: str | None = Query(None),
    faculty: str | None = Query(None),
    db_session: AsyncSession = Depends(get_db_session),
) -> dict:
    """Return section-level reports for a course or faculty in a term.

    If course_code provided  exact match; if faculty provided  ILIKE match.
    """
    conditions = ["term = :term"]
    params = {"term": term}

    if course_code:
        conditions.append("course_code = :course_code")
        params["course_code"] = course_code
    if faculty:
        conditions.append("faculty ILIKE :faculty")
        params["faculty"] = f"%{faculty}%"

    sql = (
        "SELECT * FROM grade_reports WHERE "
        + " AND ".join(conditions)
        + " ORDER BY course_code, section"
    )

    result = await db_session.execute(text(sql), params)
    # use mappings() to get dict-like rows
    rows = [dict(r) for r in result.mappings().all()]

    # Build response: sections and overall summary
    sections = []
    total_count = 0
    weighted_sum = 0.0
    for r in rows:
        sections.append(
            {
                "section": r.get("section"),
                "course_title": r.get("course_title"),
                "faculty": r.get("faculty"),
                "grades_count": r.get("grades_count"),
                "avg_gpa": float(r.get("avg_gpa")) if r.get("avg_gpa") is not None else None,
                "median_gpa": (
                    float(r.get("median_gpa")) if r.get("median_gpa") is not None else None
                ),
                "std_dev": float(r.get("std_dev")) if r.get("std_dev") is not None else None,
                "pct_A": float(r.get("pct_A")) if r.get("pct_A") is not None else None,
                "pct_B": float(r.get("pct_B")) if r.get("pct_B") is not None else None,
                "pct_C": float(r.get("pct_C")) if r.get("pct_C") is not None else None,
                "pct_D": float(r.get("pct_D")) if r.get("pct_D") is not None else None,
                "pct_F": float(r.get("pct_F")) if r.get("pct_F") is not None else None,
            }
        )
        try:
            cnt = int(r.get("grades_count") or 0)
        except Exception:
            cnt = 0
        if r.get("avg_gpa") is not None:
            weighted_sum += float(r.get("avg_gpa")) * cnt
            total_count += cnt

    overall_avg = float(weighted_sum / total_count) if total_count > 0 else None

    return {"sections": sections, "overall": {"avg_gpa": overall_avg, "total_count": total_count}}


@router.get("/search")
async def search_grades(
    term: str = Query(...),
    q: str = Query(...),
    size: int = Query(20, ge=1, le=200),
    page: int = Query(1, ge=1),
    db_session: AsyncSession = Depends(get_db_session),
) -> dict:
    """Search by course_code (exact) or faculty name (ILIKE).

    Returns matching course_code + faculty + summary.
    """
    # If q looks like a course code (contains space and digits) try exact match first
    is_course_code = any(char.isdigit() for char in q)

    params = {"term": term}
    if is_course_code:
        params["course_code"] = q
        sql = (
            "SELECT course_code, course_title, faculty, "
            "SUM(coalesce(grades_count,0))::int as total_count, "
            "AVG(coalesce(avg_gpa,0)) as avg_gpa "
            "FROM grade_reports WHERE term = :term "
            "AND course_code = :course_code "
            "GROUP BY course_code, course_title, faculty "
            "ORDER BY course_code LIMIT :limit OFFSET :offset"
        )
    else:
        params["faculty"] = f"%{q}%"
        sql = (
            "SELECT course_code, course_title, faculty, "
            "SUM(coalesce(grades_count,0))::int as total_count, "
            "AVG(coalesce(avg_gpa,0)) as avg_gpa "
            "FROM grade_reports WHERE term = :term "
            "AND faculty ILIKE :faculty "
            "GROUP BY course_code, course_title, faculty "
            "ORDER BY course_code LIMIT :limit OFFSET :offset"
        )

    params["limit"] = size
    params["offset"] = (page - 1) * size

    result = await db_session.execute(text(sql), params)
    items = [dict(r) for r in result.mappings().all()]

    # normalize numeric fields
    for it in items:
        it["avg_gpa"] = float(it["avg_gpa"]) if it.get("avg_gpa") is not None else None

    return {"items": items, "page": page, "size": size}
