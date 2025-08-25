"""Add registration_link to events table

Revision ID: 2659177a3d3a
Revises: 1ff9b347b5f3
Create Date: 2025-08-12 05:48:54.903427

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2659177a3d3a"
down_revision: Union[str, Sequence[str], None] = "1ff9b347b5f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add registration_link column to events table
    op.add_column("events", sa.Column("registration_link", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove registration_link column from events table
    op.drop_column("events", "registration_link")
