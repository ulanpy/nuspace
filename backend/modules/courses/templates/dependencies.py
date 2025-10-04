from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_creds_or_401, get_db_session
from backend.core.database.models.grade_report import CourseTemplate, StudentCourse
from backend.modules.courses.templates import schemas
from backend.modules.courses.templates.service import TemplateService


def get_template_service(db_session: AsyncSession = Depends(get_db_session)) -> TemplateService:
    return TemplateService(db_session)


async def template_exists_or_404(
    template_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> CourseTemplate:
    qb = QueryBuilder(session=db_session, model=CourseTemplate)
    template = (
        await qb
        .base()
        .eager(CourseTemplate.student, CourseTemplate.items)
        .filter(CourseTemplate.id == template_id)
        .first()
    )
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
    
    qb = QueryBuilder(session=db_session, model=CourseTemplate)
    existing = await qb.base().filter(
        CourseTemplate.course_id == payload.course_id,
        CourseTemplate.student_sub == student_sub,
    ).first()
    
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
    qb = QueryBuilder(session=db_session, model=StudentCourse)
    student_course: StudentCourse | None = (
        await qb
        .base()
        .filter(StudentCourse.id == student_course_id)
        .first()
    )
    if student_course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student course registration not found",
        )
    return student_course