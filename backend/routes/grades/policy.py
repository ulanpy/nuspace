from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.utils.enums import ResourceAction
from backend.core.database.models.grade_report import CourseItem, StudentCourse
from backend.core.database.models.user import UserRole
from backend.routes.grades.schemas import CourseItemCreate, CourseItemUpdate


class CourseItemPolicy:
    def __init__(self, user: tuple[dict, dict], db_session: AsyncSession):
        self.user = user
        self.db_session = db_session

    async def _check_item_ownership(self, item: CourseItem) -> bool:
        user_sub = self.user[0]["sub"]
        
        # Eager load the student_course relationship
        student_course = await self.db_session.get(StudentCourse, item.student_course_id)
        
        if student_course and student_course.student_sub == user_sub:
            return True
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this course item.",
        )

    async def check_permission(
        self,
        action: ResourceAction,
        item: CourseItem | None = None,
        item_data: CourseItemCreate | CourseItemUpdate | None = None,
    ) -> bool:
        user_role = self.user[1]["role"]

        if user_role == UserRole.admin.value:
            return True

        if action == ResourceAction.CREATE:
            if not item_data or not isinstance(item_data, CourseItemCreate):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid create data.")
            
            student_course = await self.db_session.get(StudentCourse, item_data.student_course_id)
            if not student_course or student_course.student_sub != self.user[0]["sub"]:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only create items for your registered courses.")
            return True

        if item is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course item not provided for permission check.")

        if action in [ResourceAction.READ, ResourceAction.UPDATE, ResourceAction.DELETE]:
            return await self._check_item_ownership(item)

        raise ValueError(f"Unhandled action type: {action}")