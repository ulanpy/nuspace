"""Set default false on communities.verified

Revision ID: 18da0a04711e
Revises: 183fea04d6e8
Create Date: 2025-08-14 12:06:44.489333

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '18da0a04711e'
down_revision: Union[str, Sequence[str], None] = '183fea04d6e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("UPDATE communities SET verified = false WHERE verified IS NULL")
    op.alter_column(
        'communities',
        'verified',
        server_default=sa.text('false'),
        existing_type=sa.Boolean(),
        existing_nullable=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'communities',
        'verified',
        server_default=None,
        existing_type=sa.Boolean(),
        existing_nullable=False,
    )
