"""add degree audit results table

Revision ID: c2f3b1c4a1d0
Revises: f57d3dcb5d7b
Create Date: 2025-12-13 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c2f3b1c4a1d0"
down_revision: Union[str, Sequence[str], None] = "f57d3dcb5d7b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "degree_audit_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_sub", sa.String(), nullable=False),
        sa.Column("admission_year", sa.String(length=16), nullable=False),
        sa.Column("major", sa.String(length=256), nullable=False),
        sa.Column("results", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("warnings", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("csv_base64", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["student_sub"], ["users.sub"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_sub", "admission_year", "major", name="uq_degree_audit_user_year_major"),
    )
    op.create_index(op.f("ix_degree_audit_results_id"), "degree_audit_results", ["id"], unique=False)
    op.create_index(op.f("ix_degree_audit_results_student_sub"), "degree_audit_results", ["student_sub"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_degree_audit_results_student_sub"), table_name="degree_audit_results")
    op.drop_index(op.f("ix_degree_audit_results_id"), table_name="degree_audit_results")
    op.drop_table("degree_audit_results")


