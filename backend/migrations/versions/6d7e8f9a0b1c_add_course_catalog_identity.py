"""add course catalog offering identity

Revision ID: 6d7e8f9a0b1c
Revises: c3e8a1b4f902
Create Date: 2026-08-23 01:30:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "6d7e8f9a0b1c"
down_revision: Union[str, Sequence[str], None] = "c3e8a1b4f902"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Allow PCC-less offerings and add stable current-catalog identity fields."""
    op.alter_column("courses", "registrar_id", existing_type=sa.Integer(), nullable=True)
    op.add_column("courses", sa.Column("catalog_id", sa.String(length=128), nullable=True))
    op.add_column("courses", sa.Column("catalog_term_id", sa.String(length=32), nullable=True))
    op.create_index("ix_courses_catalog_id", "courses", ["catalog_id"], unique=True)
    op.create_index("ix_courses_catalog_term_id", "courses", ["catalog_term_id"], unique=False)


def downgrade() -> None:
    """Remove catalog identity columns; only valid before PCC-less rows exist."""
    op.drop_index("ix_courses_catalog_term_id", table_name="courses")
    op.drop_index("ix_courses_catalog_id", table_name="courses")
    op.drop_column("courses", "catalog_term_id")
    op.drop_column("courses", "catalog_id")
    op.alter_column("courses", "registrar_id", existing_type=sa.Integer(), nullable=False)
