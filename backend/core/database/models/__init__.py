"""SQLAlchemy declarative base only.

Domain ORM models live under ``backend.modules.*.models``.
Register them via ``backend.core.database.model_registry.import_models``.
"""

from backend.core.database.models.base import Base

__all__ = ["Base"]
