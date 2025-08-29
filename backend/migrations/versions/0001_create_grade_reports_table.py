"""create grade_reports table

Revision ID: 0001_create_grade_reports_table
Revises: 
Create Date: 2025-08-29
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0001_create_grade_reports_table"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "grade_reports",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("course_code", sa.String(128), nullable=False, index=True),
        sa.Column("course_title", sa.String(512), nullable=True),
        sa.Column("section", sa.String(64), nullable=True),
        sa.Column("term", sa.String(32), nullable=True, index=True),
        sa.Column("grades_count", sa.Integer, nullable=True),
        sa.Column("avg_gpa", sa.Numeric(4, 2), nullable=True),
        sa.Column("std_dev", sa.Numeric(6, 3), nullable=True),
        sa.Column("median_gpa", sa.Numeric(4, 2), nullable=True),
        sa.Column("pct_A", sa.Numeric(5, 2), nullable=True),
        sa.Column("pct_B", sa.Numeric(5, 2), nullable=True),
        sa.Column("pct_C", sa.Numeric(5, 2), nullable=True),
        sa.Column("pct_D", sa.Numeric(5, 2), nullable=True),
        sa.Column("pct_F", sa.Numeric(5, 2), nullable=True),
        sa.Column("pct_P", sa.Numeric(5, 2), nullable=True),
        sa.Column("pct_I", sa.Numeric(5, 2), nullable=True),
        sa.Column("pct_AU", sa.Numeric(5, 2), nullable=True),
        sa.Column("pct_W_AW", sa.Numeric(5, 2), nullable=True),
        sa.Column("letters_count", sa.Integer, nullable=True),
        sa.Column("faculty", sa.String(256), nullable=True, index=True),
        sa.Column("raw_row", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("grade_reports")
