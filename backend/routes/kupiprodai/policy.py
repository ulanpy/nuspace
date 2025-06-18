from fastapi import HTTPException
from fastapi import status as http_status

from backend.common.utils.enums import ResourceAction
from backend.core.database.models.product import Product, ProductStatus
from backend.core.database.models.user import UserRole
from backend.routes.kupiprodai.schemas import ProductRequest, ProductUpdateRequest


class ProductPolicy:
    """
    Product policy class for centralized permission checking.

    **Access Policy:**
    - Admin can do everything
    - For creating products:
      - Only authenticated users can create products
      - Users can only create products for themselves (user_sub must match)
    - For reading products:
      - Anyone can read active products
      - Only owners and admins can read inactive products
    - For updating/deleting products:
      - Only product owners and admins can modify/delete their products
    """

    def __init__(self, user: tuple[dict, dict]):
        self.user = user
        self.user_role = user[1]["role"]
        self.user_sub = user[0]["sub"]

    async def check_permission(
        self,
        action: ResourceAction,
        # For resource-based authorization (single product operations)
        product: Product | None = None,
        product_data: ProductRequest | ProductUpdateRequest | None = None,
        # For intent-based authorization (listing/filtering)
        owner_sub: str | None = None,
        status: ProductStatus | None = None,
    ) -> bool:
        """
        Centralized permission checking for product actions.

        Handles two authorization patterns:
        1. Resource-based: Can user access this specific product? (when product is provided)
        2. Intent-based: Can user request products with these filters? (when product is None)

        Args:
            action: The action being performed
            user: Tuple of (user_data, permissions)
            product: Optional product object for resource-based authorization
            product_data: Optional product data for create/update actions
            owner_sub: Optional owner_sub for intent-based read operations
            status: Optional status filter for intent-based read operations

        Returns:
            bool: True if the user has permission

        Raises:
            HTTPException: If the user doesn't have permission
            ValueError: If the action type is not handled
        """

        # Admin can do everything
        if self.user_role == UserRole.admin.value:
            return True

        if action == ResourceAction.CREATE:
            return await self._check_create_permission(product_data)

        elif action == ResourceAction.READ:
            if product:
                # Resource-based authorization (single product)
                return await self._check_product_access(product)
            else:
                # Intent-based authorization (listing)
                return await self._check_listing_permission(owner_sub, status)

        elif action == ResourceAction.UPDATE:
            return await self._check_update_permission(product, product_data)

        elif action == ResourceAction.DELETE:
            return await self._check_delete_permission(product)

        # This should never happen as we've handled all enum cases
        raise ValueError(f"Unhandled action type: {action}")

    async def _check_create_permission(self, product_data: ProductRequest) -> bool:
        """Check if user can create a product."""
        if product_data.user_sub != "me":
            if product_data.user_sub != self.user_sub:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="You are not allowed to create products for other users",
                )
        return True

    async def _check_product_access(self, product: Product) -> bool:
        """
        Resource-based authorization: Check if user can access this specific product.

        Rules:
        - Anyone can access active products
        - Only owners can access their own inactive products
        - Admins already handled above
        """

        # For inactive products, only owner can access
        if product.status != ProductStatus.active:
            if product.user_sub != self.user_sub:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Product not found",  # Don't reveal it exists but is inactive
                )

        return True

    async def _check_listing_permission(
        self,
        owner_sub: str | None = None,
        status: ProductStatus | None = None,
    ) -> bool:
        """
        Intent-based authorization: Check if user can request products with these filters.

        Rules:
        - Anyone can request active products
        - Only owners can request their own inactive products
        - Users cannot request inactive products for others
        """

        # If filtering by owner
        if owner_sub == "me" or owner_sub == self.user_sub:
            return True  # Users can always request their own products

        # If requesting other than active products raise error
        if status != ProductStatus.active:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to view inactive products",
            )

        # If status is None, they want all products (which defaults to active in router)
        # If status is active, that's allowed for everyone
        return True

    async def _check_update_permission(
        self, product: Product, product_data: ProductUpdateRequest
    ) -> bool:
        """Check if user can update a product."""

        # Verifies that the user owns the existing product
        if product.user_sub != self.user_sub:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to update products for other users",
            )

        return True

    async def _check_delete_permission(self, product: Product) -> bool:
        """Check if user can delete a product."""
        if product.user_sub != self.user_sub:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Product not found or doesn't belong to you",
            )
        return True
