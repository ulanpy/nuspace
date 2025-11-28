from fastapi import HTTPException, status

from backend.common.schemas import ResourcePermissions
from backend.core.database.models.grade_report import CourseItem, StudentCourse
from backend.modules.courses.courses.base import BasePolicy
from backend.modules.courses.courses.schemas import CourseItemUpdate


class StudentCoursePolicy(BasePolicy):
    def check_create(self, student_sub: str):
        if self.is_admin:
            return
        if self.user_sub != student_sub and student_sub != "me":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only register courses for yourself.",
            )

    def check_read_list(self, student_sub: str):
        if self.is_admin:
            return
        if self.user_sub != student_sub and student_sub != "me":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own registered courses.",
            )

    def check_delete(self, student_course: StudentCourse):
        if self.is_admin:
            return
        if not self._is_owner(student_course.student_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only unregister your own courses.",
            )


class CourseItemPolicy(BasePolicy):
    def check_create(self, student_course: StudentCourse):
        if self.is_admin:
            return
        if not self._is_owner(student_course.student_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only add items to your own registered courses.",
            )

    def check_read(self, student_course: StudentCourse):
        if self.is_admin:
            return
        if not self._is_owner(student_course.student_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this course item.",
            )

    def check_update(self, student_course: StudentCourse, item_data: CourseItemUpdate):
        if self.is_admin:
            return
        if not self._is_owner(student_course.student_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this course item.",
            )

    def check_delete(self, student_course: StudentCourse):
        if self.is_admin:
            return
        if not self._is_owner(student_course.student_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this course item.",
            )

    def get_permissions(self, item: CourseItem) -> ResourcePermissions:
        permissions = ResourcePermissions(can_edit=False, can_delete=False)
        student_course_owner = item.student_course.student_sub

        if self.is_admin or self._is_owner(student_course_owner):
            permissions.can_edit = True
            permissions.can_delete = True
        return permissions