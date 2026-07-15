from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.common.dependencies import get_db_session
from backend.modules.auth.dependencies import get_creds_or_401
from backend.core.database.models.grade_report import CourseTemplate, StudentCourse
from backend.modules.courses.templates import schemas
from backend.modules.courses.templates.service import TemplateService


def get_template_service(db_session: AsyncSession = Depends(get_db_session)) -> TemplateService:
    return TemplateService(db_session)


async def template_exists_or_404(
    template_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> CourseTemplate:
    stmt = (
        select(CourseTemplate)
        .where(CourseTemplate.id == template_id)
        .options(
            selectinload(CourseTemplate.student),
            selectinload(CourseTemplate.items),
        )
    )
    result = await db_session.execute(stmt)
    template = result.scalars().first()
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return template


async def template_not_exists_or_409(
    payload: schemas.TemplateCreate,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
) -> None:
    """Check if template already exists for the course and user, throw 409 if it does."""
    student_sub = user[0].get("sub")
    
    stmt = select(CourseTemplate).where(
        CourseTemplate.course_id == payload.course_id,
        CourseTemplate.student_sub == student_sub,
    )
    result = await db_session.execute(stmt)
    existing = result.scalars().first()
    
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Template for course {payload.course_id} already exists"
        )


async def student_course_exists_or_404(
    student_course_id: int,
    db_session: AsyncSession = Depends(get_db_session),
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)] | None = None,
) -> StudentCourse:
    stmt = select(StudentCourse).where(StudentCourse.id == student_course_id)
    result = await db_session.execute(stmt)
    student_course: StudentCourse | None = result.scalars().first()
    if student_course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student course registration not found",
        )
    return student_course
