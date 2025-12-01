"""add planner schedule builder tables

Revision ID: e4b7aebbfde1
Revises: a1b2c3d4e5f6
Create Date: 2025-11-30 15:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "e4b7aebbfde1"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "planner_schedules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_sub", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=128), nullable=True),
        sa.Column("notes", sa.String(length=512), nullable=True),
        sa.Column(
            "unavailable_blocks",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["student_sub"],
            ["users.sub"],
            name="fk_planner_schedules_student",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_sub", name="uq_planner_schedule_student"),
    )
    op.create_index(
        "ix_planner_schedules_student_sub",
        "planner_schedules",
        ["student_sub"],
    )

    op.create_table(
        "planner_schedule_courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("planner_schedule_id", sa.Integer(), nullable=False),
        sa.Column("registrar_course_id", sa.String(length=64), nullable=False),
        sa.Column("course_code", sa.String(length=128), nullable=False),
        sa.Column("level", sa.String(length=64), nullable=True),
        sa.Column("school", sa.String(length=64), nullable=True),
        sa.Column("term_value", sa.String(length=32), nullable=True),
        sa.Column("term_label", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("capacity_total", sa.Integer(), nullable=True),
        sa.Column("enrollment_total", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["planner_schedule_id"],
            ["planner_schedules.id"],
            name="fk_planner_schedule_courses_schedule",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_planner_schedule_courses_schedule",
        "planner_schedule_courses",
        ["planner_schedule_id"],
    )
    op.create_index(
        "ix_planner_schedule_courses_registrar_course_id",
        "planner_schedule_courses",
        ["registrar_course_id"],
    )
    op.create_index(
        "ix_planner_schedule_courses_term_value",
        "planner_schedule_courses",
        ["term_value"],
    )
    op.create_index(
        "ix_planner_schedule_courses_term_label",
        "planner_schedule_courses",
        ["term_label"],
    )

    op.create_table(
        "planner_schedule_sections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("planner_schedule_course_id", sa.Integer(), nullable=False),
        sa.Column("section_code", sa.String(length=32), nullable=False),
        sa.Column("days", sa.String(length=32), nullable=False),
        sa.Column("times", sa.String(length=64), nullable=False),
        sa.Column("room", sa.String(length=128), nullable=True),
        sa.Column("faculty", sa.String(length=256), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("enrollment_snapshot", sa.Integer(), nullable=True),
        sa.Column("final_exam", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_selected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("meeting_hash", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["planner_schedule_course_id"],
            ["planner_schedule_courses.id"],
            name="fk_planner_schedule_sections_course",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_planner_schedule_sections_course",
        "planner_schedule_sections",
        ["planner_schedule_course_id"],
    )
    op.create_index(
        "ix_planner_schedule_sections_meeting_hash",
        "planner_schedule_sections",
        ["meeting_hash"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_planner_schedule_sections_meeting_hash",
        table_name="planner_schedule_sections",
    )
    op.drop_index(
        "ix_planner_schedule_sections_course",
        table_name="planner_schedule_sections",
    )
    op.drop_table("planner_schedule_sections")

    op.drop_index(
        "ix_planner_schedule_courses_term_label",
        table_name="planner_schedule_courses",
    )
    op.drop_index(
        "ix_planner_schedule_courses_term_value",
        table_name="planner_schedule_courses",
    )
    op.drop_index(
        "ix_planner_schedule_courses_registrar_course_id",
        table_name="planner_schedule_courses",
    )
    op.drop_index(
        "ix_planner_schedule_courses_schedule",
        table_name="planner_schedule_courses",
    )
    op.drop_table("planner_schedule_courses")

    op.drop_index(
        "ix_planner_schedules_student_sub",
        table_name="planner_schedules",
    )
    op.drop_table("planner_schedules")


