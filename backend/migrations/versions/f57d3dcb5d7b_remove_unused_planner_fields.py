"""remove unused planner fields

Revision ID: f57d3dcb5d7b
Revises: e4b7aebbfde1
Create Date: 2025-12-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f57d3dcb5d7b"
down_revision: Union[str, Sequence[str], None] = "e4b7aebbfde1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("planner_schedules", "title")
    op.drop_column("planner_schedules", "notes")
    op.drop_column("planner_schedules", "unavailable_blocks")

    op.drop_column("planner_schedule_courses", "status")

    op.drop_index(
        "ix_planner_schedule_sections_meeting_hash",
        table_name="planner_schedule_sections",
    )
    op.drop_column("planner_schedule_sections", "final_exam")
    op.drop_column("planner_schedule_sections", "meeting_hash")


def downgrade() -> None:
    op.add_column(
        "planner_schedule_sections",
        sa.Column(
            "meeting_hash",
            sa.String(length=128),
            nullable=True,
        ),
    )
    op.add_column(
        "planner_schedule_sections",
        sa.Column(
            "final_exam",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index(
        "ix_planner_schedule_sections_meeting_hash",
        "planner_schedule_sections",
        ["meeting_hash"],
    )

    op.add_column(
        "planner_schedule_courses",
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="draft",
        ),
    )

    op.add_column(
        "planner_schedules",
        sa.Column("unavailable_blocks", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
    )
    op.add_column(
        "planner_schedules",
        sa.Column("notes", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "planner_schedules",
        sa.Column("title", sa.String(length=128), nullable=True),
    )


