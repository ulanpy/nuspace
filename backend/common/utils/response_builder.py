from typing import List, Sequence, Type, TypeVar

from pydantic import BaseModel
from sqlalchemy.ext.declarative import DeclarativeMeta

T = TypeVar("T", bound=DeclarativeMeta)
R = TypeVar("R", bound=BaseModel)


def calculate_pages(count: int, size: int):
    """
    Calculate total pages for pagination.

    Parameters:
    - `count` (int): Total items.
    - `size` (int): Items per page.

    Returns:
    - `int`: Total pages (minimum 1).
    """
    return max(1, (count + size - 1) // size)


def build_schema(schema_class: Type[BaseModel], *models: BaseModel, **extra_fields) -> BaseModel:
    """
    Build a Pydantic schema instance by combining multiple models and additional fields.
    """
    data = {}
    for model in models:
        data.update(model.model_dump())
    data.update(extra_fields)
    return schema_class(**data)
