from typing import Tuple

from backend.core.database.models import Product
from backend.core.database.models.user import UserRole
from backend.common.schemas import ResourcePermissions


def get_product_permissions(
    product: Product,
    user: Tuple[dict, dict],
) -> ResourcePermissions:
    """
    Determines product permissions for a user based on their role and the product state.

    Args:
        product: The product to check permissions for
        user: The user tuple containing user info and claims

    Returns:
        ProductPermissions object containing can_edit, can_delete flags and list of editable fields
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
            "description",
            "price",
            "category",
            "condition",
            "media",
        ]
        return permissions

    # Check if user is product owner
    is_owner = product.user_sub == user_sub

    # Set can_delete permission
    permissions.can_delete = is_owner

    # Set can_edit and editable_fields based on role
    if is_owner:
        permissions.can_edit = True
        permissions.editable_fields = [
            "name",
            "description",
            "price",
            "category",
            "condition",
            "media",
        ]

    return permissions
