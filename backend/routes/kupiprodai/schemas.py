from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.common.schemas import MediaResponse, ResourcePermissions, ShortUserResponse
from backend.core.database.models.product import (
    ProductCategory,
    ProductCondition,
    ProductStatus,
)


class ProductBase(BaseModel):
    """Base class for product-related schemas."""

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "title": "Product Base Schema",
            "description": "Base schema for all product-related operations",
        },
    )


class ProductRequest(ProductBase):
    """Schema for creating a new product."""

    name: str = Field(
        ...,
        description="Name of the product",
        min_length=1,
        max_length=100,
        examples=["iPhone 13 Pro"],
    )
    description: str = Field(
        ...,
        description="Detailed description of the product",
        min_length=10,
        max_length=1000,
        examples=["Like new iPhone 13 Pro, 256GB storage, with original box and accessories"],
    )
    price: int = Field(
        ...,
        ge=1,
        le=10_000_000_000,
        description="Price of the product in whole currency units",
        examples=[999],
    )
    user_sub: str = Field(..., description="User identifier who is creating the product")
    category: ProductCategory = Field(..., description="Category of the product")
    condition: ProductCondition = Field(..., description="Physical condition of the product")
    status: ProductStatus = Field(
        default=ProductStatus.active, description="Current status of the product listing"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "title": "Product Creation Schema",
            "description": "Schema for creating a new product listing",
        }
    )


class BaseProduct(ProductBase): #ORM to Pydantic
    id: int = Field(..., description="Unique identifier of the product")
    name: str = Field(..., description="Name of the product")
    description: str = Field(..., description="Detailed description of the product")
    user_sub: str = Field(..., description="User identifier who is creating the product")
    price: int = Field(..., description="Price of the product")
    category: ProductCategory = Field(..., description="Category of the product")
    condition: ProductCondition = Field(..., description="Physical condition of the product")
    status: ProductStatus = Field(
        default=ProductStatus.active, description="Current status of the product listing"
    )
    updated_at: datetime = Field(..., description="Last update timestamp")
    created_at: datetime = Field(..., description="Creation timestamp")


class ProductResponse(BaseProduct):
    seller: ShortUserResponse | None = Field(
        default=None, description="Seller of the product"
    )
    user_telegram_id: int | None = Field(
        default=None, description="Telegram ID of the product owner"
    )
    media: List[MediaResponse] = Field(
        default=[], description="List of media attachments for the product"
    )
    permissions: ResourcePermissions = Field(
        default=ResourcePermissions(), description="Permissions for the product"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "title": "Product Response Schema",
            "description": "Schema for product data in responses",
        }
    )


class ProductUpdate(ProductBase):
    """Schema for updating an existing product."""

    name: str | None = Field(default=None, description="New name of the product")
    description: str | None = Field(default=None, description="New description of the product")
    price: int | None = Field(default=None, description="New price of the product")
    category: ProductCategory | None = Field(
        default=None, description="New category of the product"
    )
    condition: ProductCondition | None = Field(
        default=None, description="New condition of the product"
    )
    status: ProductStatus | None = Field(default=None, description="New status of the product")

    model_config = ConfigDict(
        json_schema_extra={
            "title": "Product Update Schema",
            "description": "Schema for updating an existing product",
        }
    )


class ListProduct(BaseModel):
    products: List[ProductResponse] = []
    total_pages: int

    @field_validator("total_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
