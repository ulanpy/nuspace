from backend.core.database.models import Community
from backend.common.schemas import ResourcePermissions
from backend.core.database.models.user import UserRole


def get_community_permissions(
    community: Community,
    user: tuple[dict, dict],
) -> ResourcePermissions:
    """
    Determines community permissions for a user based on their role and community state.

    Args:
        community: The community to check permissions for
        user: The user tuple containing user info and claims

    Returns:
        ResourcePermissions object containing can_edit, can_delete flags and list of editable fields
    """
    user_role = user[1]["role"]
    user_sub = user[0]["sub"]

    # Initialize permissions
    permissions = ResourcePermissions()

    # Admin can do everything
    if user_role == UserRole.admin.value:
        permissions.can_edit = True
        permissions.can_delete = True
        permissions.editable_fields = [
            "name",
            "type",
            "category",
            "recruitment_status",
            "description",
            "established",
            "head",
            "telegram_url",
            "instagram_url",
        ]
        return permissions

    # Check if user is community head
    is_head = community.head_user.sub == user_sub

    # Set permissions based on role
    if is_head:
        permissions.can_edit = True
        permissions.can_delete = False  # Only admins can delete communities
        permissions.editable_fields = [
            "name",
            "type",
            "category",
            "recruitment_status",
            "description",
            "established",
            "telegram_url",
            "instagram_url",
        ]

    return permissions
    