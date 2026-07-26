"""removed single schedule constraint

Revision ID: ac5e84afee18
Revises: 763489a551e5
Create Date: 2026-07-26 09:24:17.313228

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac5e84afee18'
down_revision: Union[str, Sequence[str], None] = '763489a551e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "planner_schedules",
        sa.Column(
            "name",
            sa.String(length=64),
            server_default="My schedule",
            nullable=False,
        ),
    )
    op.alter_column("planner_schedules", "name", server_default=None)
    op.drop_constraint(op.f("uq_planner_schedule_student"), "planner_schedules", type_="unique")


def downgrade() -> None:
    """Downgrade schema."""
    op.create_unique_constraint(
        op.f("uq_planner_schedule_student"),
        "planner_schedules",
        ["student_sub"],
        postgresql_nulls_not_distinct=False,
    )
    op.drop_column("planner_schedules", "name")
