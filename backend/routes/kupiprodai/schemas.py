from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.core.database.models.product import (
    ProductCategory,
    ProductCondition,
    ProductStatus,
)
from backend.routes.google_bucket.schemas import MediaResponse


class ProductRequestSchema(BaseModel):
    name: str
    description: str
    price: int = Field(
        ...,
        ge=1,
        le=10_000_000_000,
        description="Price of the product in whole currency units (1 to 10,000,000)",
    )
    user_sub: str
    category: ProductCategory
    condition: ProductCondition
    status: ProductStatus = ProductStatus.active

    model_config = ConfigDict(from_attributes=True)


class ProductResponseSchema(BaseModel):
    id: int
    name: str
    description: str
    user_name: str
    user_surname: str
    user_telegram_id: int
    price: int
    category: ProductCategory
    condition: ProductCondition
    status: ProductStatus = ProductStatus.active
    updated_at: datetime
    created_at: datetime
    media: List[MediaResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ProductUpdateSchema(BaseModel):
    product_id: int
    name: str | None = None
    description: str | None = None
    price: int | None = None
    category: ProductCategory | None = None
    condition: ProductCondition | None = None
    status: ProductStatus | None = None

    class Config:
        from_attributes = True  # Make sure it can be used with SQLAlchemy models


class ProductFeedbackSchema(BaseModel):
    product_id: int
    text: str


class ProductFeedbackResponseSchema(BaseModel):
    id: int
    user_name: str
    user_surname: str
    product_id: int
    text: str
    created_at: datetime


class ListProductFeedbackResponseSchema(BaseModel):
    product_feedbacks: List[ProductFeedbackResponseSchema]
    num_of_pages: int


class ProductReportSchema(BaseModel):
    product_id: int
    text: str


class ProductReportResponseSchema(BaseModel):
    id: int
    user_sub: str
    product_id: int
    text: str
    created_at: datetime


class SearchResponseSchema(BaseModel):
    id: int
    name: str


class ListSearchResponseSchema(BaseModel):
    search_result: List[SearchResponseSchema]


class ProductUpdateResponseSchema(BaseModel):
    product_id: int
    updated_fields: dict


class ListProductSchema(BaseModel):
    products: List[ProductResponseSchema] = []
    num_of_pages: int

    @field_validator("num_of_pages")
    def validate_pages(cls, value):
        if value <= 0:
            raise ValueError("Number of pages should be positive")
        return value
