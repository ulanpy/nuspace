"""added verification badge to communities

Revision ID: 183fea04d6e8
Revises: 2659177a3d3a
Create Date: 2025-08-12 14:40:32.496920

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '183fea04d6e8'
down_revision: Union[str, Sequence[str], None] = '2659177a3d3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add verified with a temporary server default to avoid NOT NULL violations on existing rows
    op.add_column(
        'communities',
        sa.Column('verified', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    )
    # Drop the server default to match model (no default at the DB level)
    op.alter_column('communities', 'verified', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('communities', 'verified')
