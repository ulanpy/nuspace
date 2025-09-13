
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.common.dependencies import get_db_session
from backend.core.database.models.grade_report import CourseItem, StudentCourse


async def course_item_exists_or_404(
    item_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> CourseItem:
    course_item = await db_session.get(CourseItem, item_id)
    if not course_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course item not found")
    return course_item


async def student_course_exists_or_404(
    student_course_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> StudentCourse:
    student_course = await db_session.get(StudentCourse, student_course_id)
    if not student_course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student course registration not found")
    return student_course