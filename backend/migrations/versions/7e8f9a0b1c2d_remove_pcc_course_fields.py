"""remove PCC course fields

Revision ID: 7e8f9a0b1c2d
Revises: 6d7e8f9a0b1c
Create Date: 2026-08-23 03:15:00
"""

import sqlalchemy as sa
from alembic import op

revision: str = "7e8f9a0b1c2d"
down_revision: str = "6d7e8f9a0b1c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Keep only schedule-catalog-backed course metadata."""
    op.drop_constraint("uq_courses_registrar_id", "courses", type_="unique")
    op.drop_index("ix_courses_registrar_id", table_name="courses")
    op.drop_column("courses", "registrar_id")
    op.drop_column("courses", "description")
    op.drop_column("courses", "department")
    op.alter_column("courses", "catalog_id", existing_type=sa.String(length=128), nullable=False)

    op.alter_column(
        "planner_schedule_courses",
        "registrar_course_id",
        new_column_name="catalog_id",
        existing_type=sa.String(length=64),
        type_=sa.String(length=128),
        existing_nullable=False,
    )
    op.execute(
        "ALTER INDEX ix_planner_schedule_courses_registrar_course_id "
        "RENAME TO ix_planner_schedule_courses_catalog_id"
    )


def downgrade() -> None:
    """Restore the former columns without reconstructing deleted PCC metadata."""
    op.execute(
        "ALTER INDEX ix_planner_schedule_courses_catalog_id "
        "RENAME TO ix_planner_schedule_courses_registrar_course_id"
    )
    op.alter_column(
        "planner_schedule_courses",
        "catalog_id",
        new_column_name="registrar_course_id",
        existing_type=sa.String(length=128),
        type_=sa.String(length=64),
        existing_nullable=False,
    )

    op.alter_column("courses", "catalog_id", existing_type=sa.String(length=128), nullable=True)
    op.add_column("courses", sa.Column("department", sa.String(length=512), nullable=True))
    op.add_column("courses", sa.Column("description", sa.String(length=4096), nullable=True))
    op.add_column("courses", sa.Column("registrar_id", sa.Integer(), nullable=True))
    op.create_index("ix_courses_registrar_id", "courses", ["registrar_id"], unique=False)
    op.create_unique_constraint("uq_courses_registrar_id", "courses", ["registrar_id"])
