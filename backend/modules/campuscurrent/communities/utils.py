from backend.common.schemas import ResourcePermissions
from backend.modules.auth.models import UserRole
from backend.modules.campuscurrent.models import Community


def get_community_permissions(
    community: Community,
    user: tuple[dict, dict],
    admin_community_ids: set[int] | None = None,
) -> ResourcePermissions:
    """
    Determines community permissions for a user based on their role and community state.
    """
    user_role = user[1]["role"]
    user_sub = user[0]["sub"]

    permissions = ResourcePermissions()

    if user_role == UserRole.admin.value:
        permissions.can_edit = True
        permissions.can_delete = True
        permissions.can_change_owner = True
        permissions.can_toggle_verified = True
        permissions.can_manage_admins = True
        permissions.can_view_admin_link = True
        permissions.editable_fields = [
            "name",
            "type",
            "category",
            "email",
            "slug",
            "page_content",
        ]
        return permissions

    is_owner = community.owner_user.sub == user_sub

    if is_owner:
        permissions.can_edit = True
        permissions.can_delete = True
        permissions.can_manage_admins = True
        permissions.can_view_admin_link = True
        permissions.editable_fields = [
            "name",
            "type",
            "category",
            "email",
            "slug",
            "page_content",
        ]

    is_community_admin = community.id in (admin_community_ids or set())

    if is_community_admin:
        permissions.can_edit = True
        permissions.can_view_admin_link = True
        if not permissions.editable_fields:
            permissions.editable_fields = [
                "name",
                "type",
                "category",
                "email",
                "slug",
                "page_content",
            ]

    return permissions
