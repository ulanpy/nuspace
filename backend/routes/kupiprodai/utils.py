from typing import List

from backend.common.schemas import MediaResponse
from backend.core.database.models.product import Product
from backend.routes.kupiprodai.schemas import (
    ProductResponseSchema,
)


def build_product_response(
    product: Product,
    media_responses: List[MediaResponse],
) -> ProductResponseSchema:
    """
    Build a ProductResponseSchema from a Product ORM object and media responses.

    Parameters:
    - product (Product): Product ORM object with loaded user relationship
    - media_responses (List[MediaResponse]): List of media response objects

    Returns:
    - ProductResponseSchema: Formatted product response with all required fields
    """
    return ProductResponseSchema(
        id=product.id,
        name=product.name,
        description=product.description,
        price=product.price,
        category=product.category,
        condition=product.condition,
        status=product.status,
        created_at=product.created_at,
        updated_at=product.updated_at,
        # Map user attributes to response fields
        user_name=product.user.name,
        user_surname=product.user.surname,
        user_telegram_id=product.user.telegram_id,
        # Add media responses
        media=media_responses,
    )
