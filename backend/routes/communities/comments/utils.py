from typing import Type

from pydantic import BaseModel
from backend.core.database.models import CommunityComment
from backend.core.database.models.user import UserRole
from backend.common.schemas import ResourcePermissions


def build_schema(schema_class: Type[BaseModel], *models: BaseModel, **extra_fields) -> BaseModel:
    data = {}
    for model in models:
        data.update(model.model_dump())
    data.update(extra_fields)
    return schema_class(**data)


def get_comment_permissions(
    comment: CommunityComment,
    user: tuple[dict, dict],
) -> ResourcePermissions:
    """
    Determines comment permissions for a user based on their role and ownership.

    Args:
        comment: The comment to check permissions for
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
            "post_id",
            "parent_id",
            "user_sub",
            "content",
        ]
        return permissions

    # Check if user is comment owner
    is_owner = comment.user_sub == user_sub

    # Set permissions based on ownership
    if is_owner:
        permissions.can_edit = True
        permissions.can_delete = True
        permissions.editable_fields = [
            "content",  #comment owner can only change content
        ]

    return permissions
