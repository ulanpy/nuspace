"""create opportunities digest table

Revision ID: 0d1c2b3a4f5e
Revises: a9e8f7d6c5b4
Create Date: 2025-02-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0d1c2b3a4f5e"
down_revision: Union[str, Sequence[str], None] = "a9e8f7d6c5b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    education_level_enum = sa.Enum(
        "UG",
        "GrM",
        "PhD",
        name="education_level",
    )
    education_level_enum.create(op.get_bind(), checkfirst=True)

    opportunity_type_enum = sa.Enum(
        "research",
        "internship",
        "summer_school",
        "forum",
        "summit",
        "grant",
        "scholarship",
        "conference",
        name="opportunity_type",
    )
    opportunity_type_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "opportunities",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("steps", sa.Text(), nullable=True),
        sa.Column("host", sa.String(length=256), nullable=True),
        sa.Column("type", opportunity_type_enum, nullable=False),
        sa.Column("majors", sa.String(length=512), nullable=True),
        sa.Column("link", sa.String(length=1024), nullable=True),
        sa.Column("location", sa.String(length=256), nullable=True),
        sa.Column("funding", sa.String(length=256), nullable=True),
    )

    op.create_table(
        "opportunity_eligibility",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("opportunity_id", sa.Integer(), sa.ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False),
        sa.Column("education_level", education_level_enum, nullable=False),
        sa.Column("min_year", sa.SmallInteger(), nullable=True),
        sa.Column("max_year", sa.SmallInteger(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("opportunity_eligibility")
    op.drop_table("opportunities")
    education_level_enum = sa.Enum(
        "UG",
        "GrM",
        "PhD",
        name="education_level",
    )
    education_level_enum.drop(op.get_bind(), checkfirst=True)
    opportunity_type_enum = sa.Enum(
        "research",
        "internship",
        "summer_school",
        "forum",
        "summit",
        "grant",
        "scholarship",
        "conference",
        name="opportunity_type",
    )
    opportunity_type_enum.drop(op.get_bind(), checkfirst=True)
