"""add rejection board

Revision ID: e8fc7f0261d4
Revises: 54efff350322
Create Date: 2026-01-10 22:47:00.390331

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8fc7f0261d4'
down_revision: Union[str, Sequence[str], None] = '54efff350322'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "rejection_board",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("nickname", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("reflection", sa.Text(), nullable=False),
        sa.Column(
            "rejection_opportunity_type",
            sa.Enum(
                "RESEARCH",
                "INTERNSHIP",
                "SCHOLARSHIP",
                "JOB",
                "GRAD_SCHOOL",
                "OTHER",
                name="rejection_opportunity_type",
            ),
            nullable=False,
        ),
        sa.Column(
            "is_accepted",
            sa.Enum("YES", "NO", name="is_accepted"),
            nullable=False,
        ),
        sa.Column(
            "still_trying",
            sa.Enum("YES", "NO", name="still_trying"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("rejection_board")
    op.execute("DROP TYPE IF EXISTS rejection_opportunity_type")
    op.execute("DROP TYPE IF EXISTS is_accepted")
    op.execute("DROP TYPE IF EXISTS still_trying")
