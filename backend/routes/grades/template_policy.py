from fastapi import HTTPException, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.core.database.models.grade_report import CourseTemplate, TemplateItem
from backend.core.database.models.user import User, UserRole
from backend.routes.grades import schemas


class BasePolicy:
    """Base policy with common user attributes."""

    def __init__(self, user: tuple[dict, dict], db_session: AsyncSession):
        if not user or not user[0] or not user[1]:
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials were not provided",
            )
        self.user_tuple = user
        self.db_session = db_session
        self.user_role = self.user_tuple[1].get("role")
        self.user_sub = self.user_tuple[0].get("sub")
        self.is_admin = self.user_role == UserRole.admin.value

    def _is_owner(self, author_sub: str) -> bool:
        return self.user_sub == author_sub


class TemplatePolicy(BasePolicy):
    """Permissions for Course Template resources."""


    async def check_read_list(self, course_id: int | None = None):
        """Check if user can list templates."""
        # Users can only list their own templates
        # No additional checks needed as templates are filtered by student_sub in the endpoint
        pass

    async def check_read_one(self, template: CourseTemplate):
        """Check if user can read a specific template."""
        if self.is_admin:
            return

        if not self._is_owner(template.student_sub):
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

    async def check_update(self, template: CourseTemplate):
        """Check if user can update a template."""
        if self.is_admin:
            return

        if not self._is_owner(template.student_sub):
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

    async def check_delete(self, template: CourseTemplate):
        """Check if user can delete a template."""
        if self.is_admin:
            return

        if not self._is_owner(template.student_sub):
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
