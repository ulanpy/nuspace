from backend.common.schemas import ResourcePermissions
from backend.core.database.models import CommunityPost
from backend.core.database.models.user import UserRole


def get_post_permissions(
    post: CommunityPost,
    user: tuple[dict, dict],
) -> ResourcePermissions:
    """
    Determines post permissions for a user based on their role and ownership.

    Args:
        post: The post to check permissions for
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
        permissions.editable_fields = ["title", "description", "tag_id"]
        return permissions

    # Check if user is post creator
    is_creator = post.user_sub == user_sub

    # Set permissions based on role and ownership
    if is_creator:
        permissions.can_edit = True
        permissions.can_delete = True
        permissions.editable_fields = [
            "title",
            "description",
            "tag_id",
        ]
    return permissions
