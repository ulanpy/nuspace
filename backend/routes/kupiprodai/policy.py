from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.utils.enums import ResourceAction
from backend.core.database.models.product import Product, ProductStatus
from backend.core.database.models.user import UserRole
from backend.routes.kupiprodai.schemas import ProductRequest, ProductUpdate


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

    def __init__(self):
        pass

    async def check_permission(
        self,
        action: ResourceAction,
        user: tuple[dict, dict],
        # For resource-based authorization (single product operations)
        product: Product | None = None,
        product_data: ProductRequest | ProductUpdate | None = None,
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
        user_role = user[1]["role"]
        user_sub = user[0]["sub"]

        # Admin can do everything
        if user_role == UserRole.admin:
            return True

        if action == ResourceAction.CREATE:
            return await self._check_create_permission(user_sub, product_data)
        
        elif action == ResourceAction.READ:
            if product:
                # Resource-based authorization (single product)
                return await self._check_product_access(user, product)
            else:
                # Intent-based authorization (listing)
                return await self._check_listing_permission(user, owner_sub, status)
        
        elif action == ResourceAction.UPDATE:
            return await self._check_update_permission(user_sub, product, product_data)
        
        elif action == ResourceAction.DELETE:
            return await self._check_delete_permission(user_sub, product)

        # This should never happen as we've handled all enum cases
        raise ValueError(f"Unhandled action type: {action}")

    async def _check_create_permission(
        self, 
        user_sub: str, 
        product_data: ProductRequest | ProductUpdate | None
    ) -> bool:
        """Check if user can create a product."""
        if product_data and product_data.user_sub != user_sub:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to create products for other users",
            )
        return True

    async def _check_product_access(self, user: tuple[dict, dict], product: Product) -> bool:
        """
        Resource-based authorization: Check if user can access this specific product.
        
        Rules:
        - Anyone can access active products
        - Only owners can access their own inactive products
        - Admins already handled above
        """
        user_sub = user[0]["sub"]
        
        if product.status == ProductStatus.active:
            return True
        
        # For inactive products, only owner can access
        if product.status == ProductStatus.inactive:
            if product.user_sub != user_sub:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found"  # Don't reveal it exists but is inactive
                )
        
        return True

    async def _check_listing_permission(
        self, 
        user: tuple[dict, dict], 
        owner_sub: str | None, 
        status: ProductStatus | None
    ) -> bool:
        """
        Intent-based authorization: Check if user can request products with these filters.
        
        Rules:
        - Anyone can request active products
        - Only owners can request their own inactive products  
        - Users cannot request inactive products for others
        """
        user_sub = user[0]["sub"]
        
        # If filtering by owner
        if owner_sub == "me" or owner_sub == user_sub:
            return True  # Users can always request their own products
        
        # If requesting inactive products for someone else or in general
        if status == ProductStatus.inactive:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to view inactive products",
            )
        
        # If status is None, they want all products (which defaults to active in router)
        # If status is active, that's allowed for everyone
        return True

    async def _check_update_permission(
        self, 
        user_sub: str, 
        product: Product | None, 
        product_data: ProductRequest | ProductUpdate | None
    ) -> bool:
        """Check if user can update a product."""
        if product and product.user_sub != user_sub:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to update products for other users",
            )
        
        if product_data and hasattr(product_data, 'user_sub') and product_data.user_sub != user_sub:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to update products for other users",
            )
        
        return True

    async def _check_delete_permission(self, user_sub: str, product: Product) -> bool:
        """Check if user can delete a product."""
        if product.user_sub != user_sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found or doesn't belong to you",
            )
        return True





