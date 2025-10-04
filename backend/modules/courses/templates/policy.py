from fastapi import HTTPException, status

from backend.common.schemas import ResourcePermissions
from backend.core.database.models.grade_report import CourseTemplate, StudentCourse
from backend.core.database.models.user import UserRole
from backend.modules.courses.templates import schemas


class BasePolicy:
    """Base policy with common user attributes."""

    def __init__(self, user: tuple[dict, dict]):
        if not user or not user[0] or not user[1]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials were not provided",
            )
        self.user_tuple = user
        self.user_role = self.user_tuple[1].get("role")
        self.user_sub = self.user_tuple[0].get("sub")
        self.is_admin = self.user_role == UserRole.admin.value

    def _is_owner(self, author_sub: str) -> bool:
        return self.user_sub == author_sub


class TemplatePolicy(BasePolicy):
    """Permissions for Course Template resources."""

    def check_create(self, template_data: schemas.TemplateCreate):
        """Check if user can create a template."""
        if self.is_admin:
            return

        # Users can only create templates for themselves
        # The student_sub is automatically set to the current user in the service
        pass

    def check_read_list(self, course_id: int | None = None):
        """Check if user can list templates."""
        # Users can only list their own templates
        # No additional checks needed as templates are filtered by student_sub in the endpoint
        pass

    def check_read_one(self, template: CourseTemplate):
        """Check if user can read a specific template."""
        if self.is_admin:
            return

        if not self._is_owner(template.student_sub):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

    def check_update(self, template: CourseTemplate, template_data: schemas.TemplateUpdate):
        """Check if user can update a template."""
        if self.is_admin:
            return

        if not self._is_owner(template.student_sub):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

    def check_delete(self, template: CourseTemplate):
        """Check if user can delete a template."""
        if self.is_admin:
            return

        if not self._is_owner(template.student_sub):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

    def check_import(self, template: CourseTemplate, student_course: StudentCourse):
        """Check if user can import template into a student course."""
        if self.is_admin:
            return

        if not self._is_owner(student_course.student_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to import this template into the course.",
            )
        
        if template.course_id != student_course.course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Template course does not match the registered course.",
            )

    def get_permissions(self, template: CourseTemplate) -> ResourcePermissions:
        """Determines template permissions for a user based on their role and the template state."""
        permissions = ResourcePermissions()

        if self.is_admin:
            permissions.can_edit = True
            permissions.can_delete = True
            permissions.editable_fields = [
                "course_id",
                "template_items",
            ]
            return permissions

        is_owner = self._is_owner(template.student_sub)

        if is_owner:
            permissions.can_edit = True
            permissions.can_delete = True
            permissions.editable_fields = [
                "course_id",
                "template_items",
            ]

        return permissions
