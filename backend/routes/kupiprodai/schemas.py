from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.common.schemas import MediaResponse
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


class ProductRequestSchema(ProductBase):
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


class ProductResponseSchema(ProductBase):
    """Schema for product response data."""

    id: int = Field(..., description="Unique identifier of the product")
    name: str = Field(..., description="Name of the product")
    description: str = Field(..., description="Detailed description of the product")
    user_name: str = Field(..., description="First name of the product owner")
    user_surname: str = Field(..., description="Last name of the product owner")
    user_telegram_id: int = Field(..., description="Telegram ID of the product owner")
    price: int = Field(..., description="Price of the product")
    category: ProductCategory = Field(..., description="Category of the product")
    condition: ProductCondition = Field(..., description="Physical condition of the product")
    status: ProductStatus = Field(
        default=ProductStatus.active, description="Current status of the product listing"
    )
    updated_at: datetime = Field(..., description="Last update timestamp")
    created_at: datetime = Field(..., description="Creation timestamp")
    media: List[MediaResponse] = Field(
        default=[], description="List of media attachments for the product"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "title": "Product Response Schema",
            "description": "Schema for product data in responses",
        }
    )


class ProductUpdateSchema(ProductBase):
    """Schema for updating an existing product."""

    product_id: int = Field(..., description="ID of the product to update")
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


class ProductFeedbackSchema(ProductBase):
    """Schema for submitting product feedback."""

    product_id: int = Field(..., description="ID of the product to provide feedback for")
    text: str = Field(
        ...,
        description="Feedback text",
        min_length=1,
        max_length=500,
        examples=["Great product, exactly as described!"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "title": "Product Feedback Schema",
            "description": "Schema for submitting feedback on a product",
        }
    )


class ProductFeedbackResponseSchema(ProductBase):
    """Schema for product feedback response."""

    id: int = Field(..., description="Unique identifier of the feedback")
    user_name: str = Field(..., description="Name of the user who provided feedback")
    user_surname: str = Field(..., description="Surname of the user who provided feedback")
    product_id: int = Field(..., description="ID of the product the feedback is for")
    text: str = Field(..., description="Feedback content")
    created_at: datetime = Field(..., description="When the feedback was created")

    model_config = ConfigDict(
        json_schema_extra={
            "title": "Product Feedback Response Schema",
            "description": "Schema for feedback data in responses",
        }
    )


class ProductReportSchema(ProductBase):
    """Schema for reporting a product."""

    product_id: int = Field(..., description="ID of the product being reported")
    text: str = Field(
        ...,
        description="Report details",
        min_length=10,
        max_length=1000,
        examples=["This product listing contains inappropriate content"],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "title": "Product Report Schema",
            "description": "Schema for reporting a product",
        }
    )


class ProductReportResponseSchema(ProductBase):
    """Schema for product report response."""

    id: int = Field(..., description="Unique identifier of the report")
    user_sub: str = Field(..., description="ID of the user who submitted the report")
    product_id: int = Field(..., description="ID of the reported product")
    text: str = Field(..., description="Report content")
    created_at: datetime = Field(..., description="When the report was created")

    model_config = ConfigDict(
        json_schema_extra={
            "title": "Product Report Response Schema",
            "description": "Schema for report data in responses",
        }
    )


class SearchResponseSchema(ProductBase):
    """Schema for search results."""

    id: int = Field(..., description="Product ID")
    name: str = Field(..., description="Product name")

    model_config = ConfigDict(
        json_schema_extra={
            "title": "Search Response Schema",
            "description": "Schema for search result data",
        }
    )


class ListProductFeedbackResponseSchema(BaseModel):
    product_feedbacks: List[ProductFeedbackResponseSchema]
    num_of_pages: int


class ListProductSchema(BaseModel):
    products: List[ProductResponseSchema] = []
    num_of_pages: int

    @field_validator("num_of_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
