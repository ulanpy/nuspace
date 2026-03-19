"""remove rejection board

Revision ID: b2f1c8d4a7e9
Revises: 8f4c32e1215d
Create Date: 2026-03-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b2f1c8d4a7e9"
down_revision: Union[str, Sequence[str], None] = "8f4c32e1215d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table("rejection_board")
    op.execute("DROP TYPE IF EXISTS rejection_opportunity_type")
    op.execute("DROP TYPE IF EXISTS is_accepted")
    op.execute("DROP TYPE IF EXISTS still_trying")


def downgrade() -> None:
    """Downgrade schema."""
    rejection_opportunity_type = sa.Enum(
        "RESEARCH",
        "INTERNSHIP",
        "SCHOLARSHIP",
        "JOB",
        "GRAD_SCHOOL",
        "OTHER",
        name="rejection_opportunity_type",
    )
    is_accepted = sa.Enum("YES", "NO", name="is_accepted")
    still_trying = sa.Enum("YES", "NO", name="still_trying")

    rejection_opportunity_type.create(op.get_bind(), checkfirst=True)
    is_accepted.create(op.get_bind(), checkfirst=True)
    still_trying.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "rejection_board",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("reflection", sa.Text(), nullable=False),
        sa.Column("rejection_opportunity_type", rejection_opportunity_type, nullable=False),
        sa.Column("is_accepted", is_accepted, nullable=False),
        sa.Column("still_trying", still_trying, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
