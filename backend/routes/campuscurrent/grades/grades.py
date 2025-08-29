import csv
from typing import Annotated

from backend.common.dependencies import get_current_principals, get_db_session
from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/grades", tags=["Grades"])


@router.post("/upload")
async def upload_grades(
    request: Request,
    file: UploadFile = File(...),
    course_code: str = Form(...),
    term: str = Form(...),
    replace: bool = Form(False),
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)] = None,
    db_session: AsyncSession = Depends(get_db_session),
):
    """Accept CSV file with grades and return import summary.

    Expected CSV columns: student_sub, student_email, student_id, grade, comment
    """

    # Read first bytes to ensure it's a CSV
    content = await file.read()
    text = content.decode("utf-8", errors="replace")
    reader = csv.DictReader(text.splitlines())

    imported = 0
    skipped = 0
    errors: list[dict] = []

    for idx, row in enumerate(reader, start=1):
        # Minimal validation: require student identifier and grade
        student = row.get("student_sub") or row.get("student_email") or row.get("student_id")
        grade = row.get("grade")
        if not student or not grade:
            skipped += 1
            errors.append({"row": idx, "error": "missing student or grade"})
            continue

        # Do not persist yet — this is a template endpoint
        imported += 1

    return {"imported": imported, "skipped": skipped, "errors": errors}
