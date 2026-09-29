from backend.common.schemas import ResourcePermissions
from backend.modules.auth.models import UserRole
from backend.modules.pages.models import Page

EDITABLE_FIELDS = ["name", "description", "slug", "page_content", "visibility"]


def get_page_permissions(
    page: Page,
    user: tuple[dict, dict],
    admin_page_ids: set[int] | None = None,
) -> ResourcePermissions:
    """
    Determines page permissions for a user based on their role and page state.
    """
    user_role = user[1]["role"]
    user_sub = user[0]["sub"]

    permissions = ResourcePermissions()

    if user_role == UserRole.admin.value:
        permissions.can_edit = True
        permissions.can_delete = True
        permissions.can_change_owner = True
        permissions.can_manage_admins = True
        permissions.can_view_admin_link = True
        permissions.editable_fields = list(EDITABLE_FIELDS)
        return permissions

    if page.owner == user_sub:
        permissions.can_edit = True
        permissions.can_delete = True
        permissions.can_manage_admins = True
        permissions.can_view_admin_link = True
        permissions.editable_fields = list(EDITABLE_FIELDS)

    if page.id in (admin_page_ids or set()):
        permissions.can_edit = True
        permissions.can_view_admin_link = True
        if not permissions.editable_fields:
            permissions.editable_fields = list(EDITABLE_FIELDS)

    return permissions
